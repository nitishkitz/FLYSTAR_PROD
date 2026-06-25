"""Pydantic schemas shared across routers."""
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=2)
    phone: str = Field(min_length=6)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class CreateStaffIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=2)
    phone: str = Field(min_length=6)
    role: Literal["admin", "employee"]


class UpdateUserIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    active: Optional[bool] = None
    role: Optional[Literal["admin", "employee", "customer"]] = None


class AddressIn(BaseModel):
    name: str
    phone: str
    line1: str
    city: str
    state: Optional[str] = ""
    country: str
    postal_code: Optional[str] = ""


class PickupRequestIn(BaseModel):
    pickup: AddressIn
    delivery: AddressIn
    shipment_type: Literal["documents", "medicines", "parcel", "commercial"]
    service: Literal["economy", "priority", "express"]
    approx_weight_kg: float = Field(gt=0)
    approx_length_cm: Optional[float] = None
    approx_width_cm: Optional[float] = None
    approx_height_cm: Optional[float] = None
    contents: str
    notes: Optional[str] = ""
    preferred_pickup_at: Optional[datetime] = None


class StatusUpdateIn(BaseModel):
    status: Literal[
        "requested", "assigned", "en_route_to_pickup", "picked_up", "at_hub",
        "packed", "dispatched", "in_transit", "customs", "out_for_delivery",
        "delivered", "exception", "cancelled"
    ]
    note: Optional[str] = ""
    location: Optional[str] = ""
    # POD fields (used only when status == 'delivered')
    receiver_name: Optional[str] = None
    signature_base64: Optional[str] = None
    pod_photo_base64: Optional[str] = None


class WaybillFillIn(BaseModel):
    sender: AddressIn
    receiver: AddressIn
    actual_weight_kg: float = Field(gt=0)
    length_cm: float = Field(gt=0)
    width_cm: float = Field(gt=0)
    height_cm: float = Field(gt=0)
    piece_count: int = Field(ge=1, default=1)
    declared_value_inr: float = Field(ge=0, default=0)
    packaging: Literal["box", "envelope", "tube", "pallet", "other"] = "box"
    contains_restricted: bool = False
    proof_photo_base64: Optional[str] = None
    notes: Optional[str] = ""


class ShipmentUpdateIn(BaseModel):
    pickup: Optional[AddressIn] = None
    delivery: Optional[AddressIn] = None
    shipment_type: Optional[str] = None
    service: Optional[str] = None
    assigned_employee_id: Optional[str] = None
    status: Optional[str] = None
    actual_weight_kg: Optional[float] = None
    declared_value_inr: Optional[float] = None
    price_inr: Optional[float] = None
    notes: Optional[str] = None


class QuoteIn(BaseModel):
    country: str
    shipment_type: Literal["documents", "medicines", "parcel", "commercial"]
    service: Literal["economy", "priority", "express"]
    weight_kg: float


class PayInvoiceIn(BaseModel):
    method: Literal["card", "upi", "netbanking", "wallet", "cash"] = "card"
    note: Optional[str] = ""
