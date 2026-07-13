from app.schemas.user import UserBase, UserCreate, UserUpdate, UserOut, Token, TokenData, LoginRequest
from app.schemas.donor import DonorProfileBase, DonorProfileCreate, DonorProfileUpdate, DonorProfileOut
from app.schemas.hospital import HospitalProfileBase, HospitalProfileCreate, HospitalProfileUpdate, HospitalProfileOut
from app.schemas.request import BloodRequestBase, BloodRequestCreate, BloodRequestUpdate, BloodRequestOut
from app.schemas.camp import DonationCampBase, DonationCampCreate, DonationCampUpdate, DonationCampOut, CampRegistrationOut
from app.schemas.slot import DonationSlotBase, DonationSlotCreate, DonationSlotUpdate, DonationSlotOut, AppointmentBase, AppointmentCreate, AppointmentUpdate, AppointmentOut
from app.schemas.inventory import BloodInventoryBase, BloodInventoryCreate, BloodInventoryUpdate, BloodInventoryOut
from app.schemas.notification import NotificationBase, NotificationCreate, NotificationOut
from app.schemas.audit import AuditLogOut
from app.schemas.ai import AIMessageBase, AIMessageCreate, AIMessageOut, AIConversationBase, AIConversationCreate, AIConversationOut

__all__ = [
    "UserBase", "UserCreate", "UserUpdate", "UserOut", "Token", "TokenData", "LoginRequest",
    "DonorProfileBase", "DonorProfileCreate", "DonorProfileUpdate", "DonorProfileOut",
    "HospitalProfileBase", "HospitalProfileCreate", "HospitalProfileUpdate", "HospitalProfileOut",
    "BloodRequestBase", "BloodRequestCreate", "BloodRequestUpdate", "BloodRequestOut",
    "DonationCampBase", "DonationCampCreate", "DonationCampUpdate", "DonationCampOut", "CampRegistrationOut",
    "DonationSlotBase", "DonationSlotCreate", "DonationSlotUpdate", "DonationSlotOut",
    "AppointmentBase", "AppointmentCreate", "AppointmentUpdate", "AppointmentOut",
    "BloodInventoryBase", "BloodInventoryCreate", "BloodInventoryUpdate", "BloodInventoryOut",
    "NotificationBase", "NotificationCreate", "NotificationOut",
    "AuditLogOut",
    "AIMessageBase", "AIMessageCreate", "AIMessageOut", "AIConversationBase", "AIConversationCreate", "AIConversationOut"
]
