from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.request import BloodRequest
from app.schemas.request import BloodRequestCreate, BloodRequestOut, BloodRequestUpdate
from app.routers.deps import get_current_user
from app.services.donor_recommendation import recommend_donors

router = APIRouter(prefix="/requests", tags=["Blood Requests"])

@router.post("/", response_model=BloodRequestOut, status_code=status.HTTP_201_CREATED)
def create_blood_request(
    request_in: BloodRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    initial_status = "pending" if current_user.role in ["admin", "hospital_ngo"] else "pending_approval"
    db_request = BloodRequest(
        recipient_id=current_user.id,
        status=initial_status,
        **request_in.model_dump()
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request

@router.get("/", response_model=list[BloodRequestOut])
def get_user_requests(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Retrieve requests created by the user or all requests if admin/hospital_ngo."""
    if current_user.role in ["admin", "hospital_ngo"]:
        return db.query(BloodRequest).all()
    return (
        db.query(BloodRequest)
        .filter(BloodRequest.recipient_id == current_user.id)
        .all()
    )

@router.get("/active", response_model=list[BloodRequestOut])
def get_all_active_requests(db: Session = Depends(get_db)):
    """Get all pending requests globally (e.g. to display on lists or maps)."""
    return db.query(BloodRequest).filter(BloodRequest.status == "pending").all()

@router.patch("/{request_id}", response_model=BloodRequestOut)
def update_request(
    request_id: int,
    request_update: BloodRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not db_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Blood request not found."
        )

    # Check permission (only creator or admin or hospital can update)
    if (
        db_request.recipient_id != current_user.id
        and current_user.role not in ["admin", "hospital_ngo"]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to update this request.",
        )

    for key, value in request_update.model_dump(exclude_unset=True).items():
        setattr(db_request, key, value)

    db.commit()
    db.refresh(db_request)
    return db_request

@router.get("/{request_id}/matches")
def get_matches_for_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Find recommended donor matches for a specific request."""
    db_request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not db_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Blood request not found."
        )

    # Allow creator, donors, or staff/admins to see matches
    recommendations = recommend_donors(
        db,
        blood_group=db_request.blood_group,
        latitude=db_request.latitude,
        longitude=db_request.longitude,
        limit=5,
    )

    results = []
    for rec in recommendations:
        d = rec["donor"]
        results.append({
            "id": d.id,
            "blood_group": d.blood_group,
            "availability": d.availability,
            "city": d.city,
            "contact_info": d.contact_info,
            "is_verified": d.is_verified,
            "distance_km": rec["distance_km"],
            "score": rec["score"],
            "full_name": rec["user_name"],
            "email": rec["email"],
            "latitude": d.latitude,
            "longitude": d.longitude
        })
    return results
