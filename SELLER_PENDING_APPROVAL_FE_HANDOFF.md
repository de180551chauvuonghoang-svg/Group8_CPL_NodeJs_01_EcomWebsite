# FE Handoff - Seller Pending Approval

## 1. Trang thai BE

BE da hoan thanh va verify ngay 2026-07-30.

Luong moi:

```txt
customer -> gui don -> pending -> Admin duyet -> active + role seller
```

Dang ky khong con kich hoat seller ngay, khong cap token moi va khong chuyen thang vao Seller Dashboard.

## 2. Contract API

### 2.1. Lay trang thai don

```http
GET /api/seller/application
Authorization: Bearer <current-token>
```

Type FE:

```ts
export type SellerApplicationStatus =
  | 'pending'
  | 'active'
  | 'rejected'
  | 'suspended';

export interface SellerApplication {
  sellerId: string;
  shopName: string;
  status: SellerApplicationStatus;
  createdAt: string;
  updatedAt: string;
}
```

Co don:

```json
{
  "status": "success",
  "data": {
    "application": {
      "sellerId": "sel_xxx",
      "shopName": "Shop A",
      "status": "pending",
      "createdAt": "2026-07-30T08:00:00.000Z",
      "updatedAt": "2026-07-30T08:00:00.000Z"
    }
  }
}
```

Chua tung dang ky: `data.application = null`.

API nay khong tra CCCD, so tai khoan hoac thong tin ngan hang. Hien chua co `rejectionReason`.

### 2.2. Gui don hoac gui lai don rejected

```http
POST /api/seller/register
Authorization: Bearer <current-token>
Content-Type: application/json
```

Payload giu nguyen:

```ts
{
  shopName: string;          // required
  shopPhone: string;         // required, /^0\d{9}$/
  shopAddress: string;       // required
  pickupAddress?: string;
  description?: string;
  logoUrl?: string;
  logoPublicId?: string;
  coverUrl?: string;
  coverPublicId?: string;
  identityName?: string;
  identityNumber?: string;   // neu co: /^\d{12}$/
  bankName?: string;
  bankAccountNo?: string;    // neu co: /^\d{6,20}$/
  bankAccountHolder?: string;
}
```

Response thanh cong:

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

Khong con `data.user` va `data.accessToken`.

### 2.3. Upload logo/cover khi dang ky

Become Seller khong dung endpoint upload anh san pham.

```http
POST /api/seller/application/uploads/images
Authorization: Bearer <current-token>
Content-Type: multipart/form-data

file=<binary>
purpose=shop_logo|shop_cover
```

Response giong upload hien tai:

```ts
{
  status: 'success';
  data: {
    url: string;
    publicId: string;
    purpose: 'shop_logo' | 'shop_cover';
    width: number;
    height: number;
    bytes: number;
    format: string;
  };
}
```

Xoa anh da upload nhung khong dung:

```http
DELETE /api/seller/application/uploads/images
Content-Type: application/json

{ "publicId": "volitify/<userId>/shop_logo/..." }
```

Rule upload:

```txt
no application -> duoc upload
rejected       -> duoc upload de sua va gui lai
pending        -> 409 SELLER_APPLICATION_PENDING
active         -> 409 SELLER_ALREADY_ACTIVE
suspended      -> 403 SELLER_SUSPENDED
purpose product -> 400 INVALID_APPLICATION_IMAGE_PURPOSE
```

`POST /api/seller/uploads/images` va alias `/api/uploads/images` van chi danh cho seller active.

## 3. Error codes FE phai xu ly

| HTTP | code | Xu ly UI |
|---|---|---|
| 409 | `SELLER_APPLICATION_PENDING` | Chuyen sang man cho duyet, goi lai GET application |
| 409 | `SELLER_ALREADY_ACTIVE` | Refresh profile user, sau do vao Seller Dashboard |
| 403 | `SELLER_SUSPENDED` | Hien man shop bi tam ngung, khong hien form |
| 409 | `SHOP_NAME_TAKEN` | Bao loi ngay field shopName |
| 403 | `APPLICATION_IMAGE_NOT_OWNED` | Khong submit; yeu cau upload lai logo/cover |
| 403 | `SELLER_NOT_ACTIVE` | Chan trang seller management, refresh user/application |
| 400 | `INVALID_APPLICATION_IMAGE_PURPOSE` | FE dang goi sai endpoint/purpose |
| 400 | `IMAGE_FILE_REQUIRED` | Chua chon file |
| 400 | `INVALID_IMAGE_TYPE` / `INVALID_IMAGE_CONTENT` | File khong phai anh hop le |
| 400 | `IMAGE_TOO_LARGE` | Anh vuot 5 MB |

Luu y interceptor `api.ts` hien reject `{ message, status, data }`. Lay code bang `error.data?.code`, khong dung `error.response?.data?.code`.

## 4. State machine trang Become Seller

Khi mo `/become-seller`, goi `GET /seller/application` truoc khi render form:

```txt
loading   -> skeleton/loading
null      -> hien form dang ky
pending   -> man "Ho so dang cho duyet", disable submit/upload
rejected  -> hien thong bao bi tu choi + form cho phep sua va gui lai
suspended -> man "Cua hang dang bi tam ngung", khong cho gui lai
active    -> refresh user profile -> update AuthContext -> /seller/dashboard
```

Khong render form trong luc GET application dang loading, tranh flash form va submit trung.

Sau POST thanh cong:

```txt
1. Khong ghi localStorage token/user.
2. Khong goi authCtx.updateUser(data.user).
3. Khong navigate /seller/dashboard.
4. Set application = { sellerId, status: 'pending' }.
5. Hien man cho duyet ngay.
```

Man pending nen co nut `Kiem tra trang thai`. Co the refetch khi window focus; neu polling thi 30-60 giay, dung polling khi roi trang.

## 5. Cac file FE can sua

| File | Thay doi |
|---|---|
| `frontend/src/services/sellerService.ts` | Bo luu token trong `registerSeller`; them `getSellerApplication`; tra ve `data.application` ro rang |
| `frontend/src/services/uploadService.ts` | Them `uploadApplicationImage` va `deleteApplicationImage` dung endpoint application |
| `frontend/src/components/common/ImageUploadField.tsx` | Them scope/handler upload de Become Seller dung application endpoint; cac trang product/profile seller giu endpoint cu |
| `frontend/src/pages/BecomeSeller.tsx` | Them application loading/state machine; bo update role va redirect ngay sau submit |
| `frontend/src/context/AuthContext.tsx` | Khuyen nghi them `refreshUser()` de dong bo role sau khi Admin approve |
| `frontend/src/types.ts` | Them `SellerApplicationStatus` va `SellerApplication` |
| `frontend/src/routes/RouteGuards.tsx` | Neu API tra `SELLER_NOT_ACTIVE`, dua user ve Become Seller/status page thay vi de trang seller loi |

Service goi API nen viet ro:

```ts
getSellerApplication: async (): Promise<SellerApplication | null> => {
  const response: any = await API.get('/seller/application');
  return response.data?.application ?? null;
},

registerSeller: async (payload): Promise<{ sellerId: string; status: 'pending' }> => {
  const response: any = await API.post('/seller/register', payload);
  return response.data.application;
},
```

## 6. Auth va token sau khi Admin duyet

Admin approve se doi DB trong mot transaction:

```txt
Sellers.status: pending -> active
Users.role: customer -> seller
```

BE `protect` doc user moi tu DB moi request, nen access token customer cu van xac thuc duoc. FE van phai goi API profile de cap nhat `AuthContext.user.role` va `localStorage.ecom_user`, neu khong `SellerRoute` se tiep tuc xem user la customer.

Khong tu sua role trong localStorage va khong tu tao seller token o FE.

## 7. Tac dong den catalog va category

- Public shop/product chi tra du lieu cua shop `active`.
- Checkout tra `400 PRODUCT_UNAVAILABLE` neu gio cu con san pham cua shop inactive.
- `GET /api/seller/categories` chi tra category `is_active = 1`.
- Tao/cap nhat product bang category bi tat tra `SELLER_CATEGORY_INACTIVE`.
- San pham cu thuoc category bi tat khong bi xoa.

FE gio hang khi gap `PRODUCT_UNAVAILABLE` nen refetch cart/product, bo item khong con hop le va yeu cau customer xac nhan lai tong tien.

## 8. Checklist test FE

```txt
[ ] Customer chua co don thay form Become Seller.
[ ] Logo/cover upload qua /seller/application/uploads/images.
[ ] Gui form thanh cong van giu role customer va token cu.
[ ] Sau submit hien pending, khong vao /seller/dashboard.
[ ] Refresh trang van hien pending tu DB.
[ ] Click submit trung/response pending khong tao them don.
[ ] rejected hien form gui lai; submit xong quay ve pending.
[ ] suspended khong hien form va khong vao trang seller.
[ ] active refresh profile, cap nhat AuthContext va vao dashboard.
[ ] SHOP_NAME_TAKEN hien dung tai ten shop.
[ ] Existing active seller van vao dashboard va upload product binh thuong.
[ ] Category inactive bien mat khoi select.
[ ] Gio cu co product cua shop inactive xu ly PRODUCT_UNAVAILABLE.
```

## 9. Chua thuoc phase FE nay

- UI/Admin API approve, reject, suspend, reactivate.
- Ly do reject (`rejectionReason`) vi schema hien chua co field nay.
- Email thong bao duyet/tuchoi.
- Tu dong xoa anh Cloudinary neu user upload roi bo form ma khong submit.
