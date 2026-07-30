# Seller BE Spec - Pending Approval Workflow

> Trang thai: BE da trien khai va verify ngay 2026-07-30.
> Contract FE chi tiet nam tai `SELLER_PENDING_APPROVAL_FE_HANDOFF.md`.

## 1. Muc tieu

Chuyen luong Become Seller tu tu dong kich hoat sang cho Admin duyet:

```txt
customer -> gui yeu cau -> pending -> Admin approve -> active/seller
```

Existing seller dang `active` khong bi thay doi. Pham vi nay chi thay doi luong dang ky moi, truy van trang thai don va bao ve Seller API.

## 2. Van de trong code hien tai

`sellerService.registerSeller()` hien dang:

- Insert `Sellers.status = 'active'`.
- Update ngay `Users.role = 'seller'`.
- Neu user da co Sellers record thi van update role thanh seller.

`registerSeller` controller hien dang ky lai JWT co role seller va tra token moi ngay sau khi gui form.

`seller.routes.js` chi dung `protect` va `restrictTo('seller')`, chua kiem tra `Sellers.status = 'active'`.

## 3. Schema Sellers

Trang thai hop le:

```txt
pending
active
rejected
suspended
```

Thay default cua `Sellers.status` tu `active` thanh `pending` cho database moi. Service van phai insert ro `pending`, khong phu thuoc default.

Migration khong duoc doi cac shop dang `active` thanh `pending`.

Khuyen nghi them index:

```sql
CREATE INDEX IX_Sellers_status_created_at
ON Sellers(status, created_at DESC);
```

## 4. POST /api/seller/register

Authorization:

```txt
Bearer token cua user/customer dang dang nhap
```

Validation thong tin shop hien tai duoc giu nguyen:

```txt
shopName bat buoc va unique
shopPhone dung 10 chu so, bat dau bang 0
shopAddress bat buoc
identityNumber neu co phai dung 12 chu so
bankAccountNo neu co phai tu 6-20 chu so
```

Xu ly trong transaction:

```txt
1. Khoa/kiem tra Sellers theo user_id.
2. Kiem tra shop_name dang duoc su dung boi shop khac.
3. Neu chua co don: INSERT Sellers voi status = pending.
4. Khong update Users.role.
5. Khong cap seller JWT moi.
6. Commit va tra trang thai pending.
```

Xu ly khi user da co Sellers record:

| Trang thai | Xu ly |
|---|---|
| `pending` | Tra `409 SELLER_APPLICATION_PENDING` |
| `active` | Tra `409 SELLER_ALREADY_ACTIVE` |
| `suspended` | Tra `403 SELLER_SUSPENDED` |
| `rejected` | Cho cap nhat lai du lieu, dat lai `pending` va gui lai |

Response tao/gui lai thanh cong:

```json
{
  "status": "success",
  "message": "Yeu cau mo cua hang da duoc gui va dang cho duyet.",
  "data": {
    "application": {
      "sellerId": "sel_xxx",
      "status": "pending"
    }
  }
}
```

Khong tra `accessToken` moi va khong tra `user.role = seller`.

## 5. GET /api/seller/application

Endpoint nay phai duoc khai bao truoc middleware `restrictTo('seller')` de customer dang cho duyet goi duoc.

```http
GET /api/seller/application
Authorization: Bearer <access-token>
```

Response khi co don:

```json
{
  "status": "success",
  "data": {
    "application": {
      "sellerId": "sel_xxx",
      "shopName": "Shop A",
      "status": "pending",
      "createdAt": "ISOString",
      "updatedAt": "ISOString"
    }
  }
}
```

Response khi chua tung dang ky:

```json
{
  "status": "success",
  "data": {
    "application": null
  }
}
```

Khong tra CCCD day du hoac thong tin ngan hang nhay cam trong endpoint trang thai nay.

## 6. Middleware Seller Active

Thu tu thuc te duoc chot nhu sau:

```txt
protect
-> requireActiveSeller
-> restrictTo('seller')
-> controller Seller
```

Kiem tra shop truoc role de pending/rejected/suspended luon nhan cung contract
`403 SELLER_NOT_ACTIVE`, ke ca khi Admin da doi role cua suspended seller ve customer.

Middleware truy van Sellers bang `req.user.id` va chi cho qua khi `status = 'active'`.

Error:

```json
{
  "status": "fail",
  "code": "SELLER_NOT_ACTIVE",
  "message": "Cua hang hien khong hoat dong."
}
```

HTTP status: `403`.

Public shop va public product phai tiep tuc chi hien shop `active`.

## 6.1. Upload Anh Ho So Dang Ky

Form Become Seller can upload logo/cover truoc khi co seller active, vi vay dung endpoint rieng:

```txt
POST   /api/seller/application/uploads/images
DELETE /api/seller/application/uploads/images
```

Rule:

```txt
- Auth customer/seller.
- Chi nhan purpose = shop_logo | shop_cover.
- User chua co don hoac don rejected duoc upload/xoa.
- pending -> 409 SELLER_APPLICATION_PENDING.
- active -> 409 SELLER_ALREADY_ACTIVE.
- suspended -> 403 SELLER_SUSPENDED.
- product image van dung /api/seller/uploads/images va bat buoc shop active.
- logoPublicId/coverPublicId khi submit phai thuoc folder Cloudinary cua current user.
```

## 7. Category Integration

Sua `getSellerCategories()` de category bi Admin tat khong con xuat hien trong form Seller:

```sql
WHERE is_active = 1
  AND id IN (...)
```

San pham cu thuoc category bi tat khong bi xoa. Seller chi khong duoc chon category do cho san pham moi/cap nhat moi.

## 8. Cac phan Seller BE khong can viet lai

### Voucher

Giu nguyen:

```txt
Seller create -> seller_id = currentSellerId
Seller list/update/delete -> filter seller_id = currentSellerId
Seller stats -> chi du lieu shop hien tai
```

### Inventory

Giu `inventoryService` hien tai lam nguon logic chinh. Seller la role duy nhat dieu chinh stock trong MVP.

### Order va Analytics

Giu `OrderItems.fulfillment_status` va rule doanh thu `delivered_items_gross`. Khong chuyen nguoc ve tinh theo `Orders.status`.

## 9. Acceptance Tests

```txt
Customer gui Become Seller -> Sellers.status = pending.
Users.role sau khi gui don van la customer.
Response khong co seller token.
Customer pending khong truy cap duoc /api/seller/products.
GET /api/seller/application tra dung pending.
Gui lai khi pending -> 409 SELLER_APPLICATION_PENDING.
Shop active cu van hoat dong binh thuong.
Shop suspended bi Seller API tra 403 SELLER_NOT_ACTIVE.
Don rejected duoc cap nhat va gui lai thanh pending.
Category is_active = 0 khong xuat hien trong Seller categories.
Form dang ky upload duoc logo/cover nhung khong upload duoc product.
Don pending/active/suspended khong duoc upload lai anh ho so dang ky.
Public product va checkout khong dung san pham cua shop inactive.
Voucher, inventory, order va analytics Seller khong bi regression.
```

## 10. Contract de Admin tiep quan

Sau khi spec nay hoan thanh, Admin chi can thay doi role/status qua transaction:

```txt
approve:    pending -> active, Users.role -> seller
reject:     pending -> rejected, Users.role giu customer
suspend:    active -> suspended, Users.role -> customer
reactivate: suspended -> active, Users.role -> seller
```
