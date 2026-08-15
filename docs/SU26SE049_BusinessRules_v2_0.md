SU26SE049 — Business Rules Specification

BUSINESS RULES SPECIFICATION

Crowdsourced Application for Reporting Environmental Pollution

Ứng dụng báo cáo điểm rác thải và ô nhiễm môi trường

Project Code: SU26SE049

| Document       | Business Rules Specification (BR)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version        | 2.0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Status         | Approved                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Last Updated   | 07/08/2026                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Supervisor     | Nguyễn Thị Cẩm Hương (huongntc2@fe.edu.vn)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Duration       | 01/01/2026 – 30/04/2026                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Scope          | Toàn quốc Việt Nam (đô thị lớn, TP trực thuộc TW, tỉnh lẻ & nông thôn)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Change Summary | Viết lại toàn bộ từ v1.2 dựa trên source code thực tế. Đánh lại toàn bộ BR ID. Bổ sung: module BR-CMU (Community Cleanup), ViolatingEntity, Inspection checklist workflow (BR-INS-033), WasteTag system, Google SSO, Comment media/likes, Violation Recurrence detection (BR-REP-034), Data consent (BR-DAT-005), Account restore. Viết lại: InspectionReport state machine, Reopen flow (citizen request → LEO approve), Payment model (full payment only), SLA inspection, Notification 40+ types. |

# 1. Tổng quan (Overview)

Tài liệu này đặc tả toàn bộ Business Rules (BR) của hệ thống Crowdsourced Application for Reporting Environmental Pollution. Các rule được nhóm theo chức năng nghiệp vụ. Phạm vi triển khai là toàn quốc Việt Nam — bao phủ từ đô thị lớn (TP.HCM, Hà Nội), các Thành phố trực thuộc Trung ương, đến tỉnh lẻ và khu vực nông thôn/huyện vùng xa.

Hệ thống có 10 actors: Citizen; Department Environmental Officer (DEO – cấp Tỉnh/Thành phố); Local Environmental Officer (LEO – cấp Xã/Phường); Company Manager (Quản lý Công ty Dịch vụ Môi trường); Company Staff (Nhân viên Công ty); Environmental Cleanup Team (Cleaner); Environmental Inspection Team (Inspector); System Administrator; AI Service (automated); và Community Organization (optional).

Trong đó 8 vai trò có thể gán cho người dùng (human roles): Citizen, DEO, LEO, CompanyManager, CompanyStaff, Cleaner, Inspector, Admin. AI Service là dịch vụ tự động và Community Organization là vai trò chỉ-đọc/khai thác open data.

Mỗi rule có định danh duy nhất theo cú pháp BR-<MODULE>-<NNN>, giúp truy vết trong tài liệu phân tích thiết kế và test case.

## 1.1 Quy ước định danh (ID Convention)

- BR-AUTH-xxx: Xác thực, tài khoản
- BR-ORG-xxx: Cơ cấu tổ chức & định tuyến theo địa giới hành chính
- BR-REP-xxx: Quản lý báo cáo ô nhiễm
- BR-MAP-xxx: Bản đồ & vị trí
- BR-OFF-xxx: Environmental Officer (DEO & LEO)
- BR-CLN-xxx: Environmental Cleanup Team
- BR-CMU-xxx: Community Cleanup Program (NEW v2.0)
- BR-INS-xxx: Environmental Inspection Team (xử phạt)
- BR-CMP-xxx: Công ty Dịch vụ Môi trường & quản lý hợp đồng
- BR-NTF-xxx / BR-CMT-xxx: Thông báo & bình luận
- BR-GAM-xxx: Gamification (points, badges, leaderboard)
- BR-AI-xxx: AI Service
- BR-ADM-xxx: Quản trị hệ thống
- BR-DAT-xxx: Dữ liệu, quyền riêng tư, tuân thủ
- BR-SYS-xxx: Phi chức năng, hệ thống

## 1.2 Phân loại Rule Type

Validation: Ràng buộc dữ liệu đầu vào. Business Logic: Công thức, thuật toán nghiệp vụ. Authorization: Phân quyền. State Machine: Quy tắc chuyển trạng thái. Security / Privacy / Compliance: An toàn & tuân thủ. SLA: Thỏa thuận mức dịch vụ. Anti-Spam / Anti-Fraud: Chống gian lận. Auditability: Ghi log. Performance / Scalability / Availability: Phi chức năng.

## 1.3 Các thay đổi chính trong v2.0 (Change Log)

- **Đánh lại toàn bộ BR ID** cho mạch lạc. Mọi tham chiếu v1.2 cần map sang ID mới trong tài liệu này.

- **Module BR-CMU (Community Cleanup Program):** Chương trình dọn dẹp cộng đồng do LEO mở trên báo cáo Verified; Cleaner Leader dẫn dắt, Citizen đăng ký tham gia. State machine: OpenForJoin → JoinClosed → InProgress → PendingVerification → Completed/Cancelled.

- **ViolatingEntity:** Entity chuẩn hóa đối tượng vi phạm (cá nhân/doanh nghiệp) cho repeat offender detection, thay thế string-matching.

- **Inspection checklist workflow (BR-INS-033):** AcceptTask → ConfirmArrival → SubmitFieldInvestigation → IssuePenalty/CloseNoViolation. Field investigation phải submit trước khi issue penalty.

- **Payment model:** Chỉ chấp nhận nộp phạt đúng số tiền còn lại (full payment only), không còn partial payment.

- **WasteTag system:** Officers tag báo cáo với loại rác cụ thể (HOUSEHOLD, MEDICAL, ANIMAL_CARCASS...) để cleanup team chuẩn bị thiết bị phù hợp. AI gợi ý waste tags.

- **Google SSO:** Đăng nhập/đăng ký qua Google OAuth 2.0, email tự verified.

- **Violation Recurrence Detection (BR-REP-034):** Hệ thống phát hiện báo cáo mới gần báo cáo đã Closed (cùng category, ≤25m, trong 30 ngày) — nghi ngờ tái phát vi phạm, thông báo LEO.

- **Reopen flow cải tiến:** Citizen gửi yêu cầu reopen (kèm ảnh + lý do) → LEO approve/reject → Reopened state riêng (max 1 lần, trong 7 ngày sau Resolved).

- **Comment media + likes:** Bình luận có thể đính kèm ảnh/video và nhận lượt thích.

- **Data consent (BR-DAT-005):** User phải đồng ý xử lý dữ liệu (ảnh, GPS) trước khi gửi báo cáo.

- **Account restore:** Tài khoản soft-deleted có thể khôi phục trong 90 ngày.

- **Notification mở rộng:** 40+ loại thông báo, hỗ trợ FCM push + Email, preference toggles.

# 2. Actors và ma trận quyền (Role Matrix)

Hệ thống có 10 actors. Ma trận dưới đây tóm tắt quyền của từng actor với các chức năng cốt lõi. Cột viết tắt: Cit=Citizen, DEO, LEO, CM=Company Manager, CS=Company Staff, Cln=Cleaner, Ins=Inspector, Adm=Admin, AI=AI Service, Com=Community Organization.

| Chức năng                             | Cit | DEO    | LEO  | CM  | CS  | Cln | Ins | Adm | AI  | Com |
| ------------------------------------- | --- | ------ | ---- | --- | --- | --- | --- | --- | --- | --- |
| Gửi báo cáo ô nhiễm                   | ✓   | ✗      | ✗    | ✗   | ✗   | ✗   | ✗   | ✗   | —   | ✗   |
| Xem bản đồ công khai                  | ✓   | ✓      | ✓    | ✓   | ✓   | ✓   | ✓   | ✓   | —   | ✓   |
| Xác minh & tiếp nhận báo cáo          | ✗   | ✓¹     | ✓    | ✗   | ✗   | ✗   | ✗   | ✓   | —   | ✗   |
| Điều phối dọn dẹp (gán Cleanup)       | ✗   | ✓      | ✓    | ✗   | ✗   | ✗   | ✗   | ✓   | —   | ✗   |
| Mở Community Cleanup program          | ✗   | ✗      | ✓    | ✗   | ✗   | ✗   | ✗   | ✗   | —   | ✗   |
| Tham gia Community Cleanup            | ✓   | ✗      | ✗    | ✗   | ✗   | ✗   | ✗   | ✗   | —   | ✗   |
| Dẫn dắt Community Cleanup (Leader)    | ✗   | ✗      | ✗    | ✗   | ✗   | ✓   | ✗   | ✗   | —   | ✗   |
| Lập InspectionReport (cần xử phạt)    | ✗   | ✗      | ✓    | ✗   | ✗   | ✗   | ✗   | ✓   | —   | ✗   |
| Quản lý công ty & nhân viên           | ✗   | ✗      | ✗    | ✓   | ✗   | ✗   | ✗   | ✓   | —   | ✗   |
| Nhận & phân công đội công ty          | ✗   | ✗      | ✗    | ✓   | ✗   | ✗   | ✗   | ✓   | —   | ✗   |
| Dọn dẹp & cập nhật before/after       | ✗   | ✗      | ✗    | ✗   | ✓   | ✓   | ✗   | ✓   | —   | ✗   |
| Lập biên bản & ra QĐ xử phạt          | ✗   | ✗      | ✗    | ✗   | ✗   | ✗   | ✓   | ✓   | —   | ✗   |
| Tạo tài khoản công ty (theo HĐ)       | ✗   | ✓²     | ✗    | ✗   | ✗   | ✗   | ✗   | ✓   | —   | ✗   |
| Cấu hình hệ thống                     | ✗   | ✗      | ✗    | ✗   | ✗   | ✗   | ✗   | ✓   | —   | ✗   |
| Phân loại / AI gợi ý                  | —   | —      | —    | —   | —   | —   | —   | —   | ✓   | —   |
| Xuất open data                        | ✗   | T.tỉnh | Xã/P | Cty | ✗   | ✗   | ✗   | ✓   | —   | ✓   |
| Leaderboard / Badge                   | ✓   | ✗      | ✗    | ✗   | ✗   | ✗   | ✗   | ✓ql | —   | ✗   |

Ghi chú:

- ¹ DEO chỉ xác minh báo cáo trong 'Department Common Queue' (xã/phường chưa onboard). Luồng xác minh & điều phối thường ngày do LEO cấp xã/phường đảm nhận.

- ² DEO tạo tài khoản Công ty (Company Manager) trong phạm vi tỉnh/thành phố mình quản lý, theo hợp đồng (BR-CMP-001..004). Admin vẫn có toàn quyền tạo mọi vai trò trên toàn hệ thống.

- Company Staff thực hiện luồng vận hành giống Cleaner nhưng thuộc đội do Company Manager quản lý.

- Cleanup được thực hiện bởi: (a) Đội Công ty (đô thị/đầu nguồn), (b) Đội cộng đồng cấp xã/phường (HTX/Tổ tự quản), hoặc (c) Community Cleanup program (Citizen tình nguyện, Cleaner Leader dẫn dắt).

- Khách chưa đăng nhập (Guest) KHÔNG phải là actor: chỉ xem được bản đồ & thông tin công khai (read-only). Mọi chức năng ghi/tương tác đều bắt buộc đăng nhập (BR-AUTH-017).

- Inspection Team xử lý xử phạt cho mọi loại ô nhiễm khi LEO lập InspectionReport (BR-INS-001).

# 3. Xác thực & Tài khoản (Authentication & Account)

Nhóm rule quản lý đăng ký, đăng nhập, session và quản lý hồ sơ cho tất cả các loại user.

| ID          | Rule Name                         | Description                                                                                                                                                                                                                                                             | Type          | Error Message / Behavior                                                              |
| ----------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------- |
| **3.1 Đăng ký (Registration)** | | | | |
| BR-AUTH-001 | Định dạng Email                   | Email phải đúng định dạng RFC 5322 (có @, domain hợp lệ). Lưu trữ lowercase.                                                                                                                                                                                           | Validation    | Email không đúng định dạng.                                                            |
| BR-AUTH-002 | Email duy nhất                    | Mỗi email chỉ được đăng ký một tài khoản duy nhất trong hệ thống. Unique index trên DB.                                                                                                                                                                                 | Uniqueness    | Email này đã được sử dụng.                                                             |
| BR-AUTH-003 | Định dạng SĐT                     | Chấp nhận định dạng Việt Nam: +84 hoặc 0 + 9 chữ số, bắt đầu bằng 3/5/7/8/9. Unique index trên DB.                                                                                                                                                                      | Validation    | Số điện thoại không hợp lệ                                                             |
| BR-AUTH-004 | SĐT duy nhất                      | Mỗi số điện thoại chỉ được gắn với một tài khoản duy nhất.                                                                                                                                                                                                              | Uniqueness    | Số điện thoại đã được sử dụng                                                          |
| BR-AUTH-005 | Độ mạnh mật khẩu                  | Tối thiểu 8 ký tự, tối đa 32 ký tự, bắt buộc có ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt (!@#$%^&\*). Lưu trữ bằng bcrypt cost ≥ 12 (BR-DAT-001).                                                                                                 | Validation    | Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt    |
| BR-AUTH-006 | Xác nhận mật khẩu                 | Trường 'Xác nhận mật khẩu' phải khớp chính xác với trường 'Mật khẩu'.                                                                                                                                                                                                   | Validation    | Mật khẩu xác nhận không khớp                                                           |
| BR-AUTH-007 | Thời hạn mã OTP                   | Mã xác thực (Email/OTP) có hiệu lực trong vòng 10 phút. Quá hạn mã sẽ mất hiệu lực.                                                                                                                                                                                     | Security      | Mã xác thực đã hết hạn. Vui lòng yêu cầu gửi lại                                      |
| BR-AUTH-008 | Vai trò mặc định                  | Tài khoản tự đăng ký qua app mặc định là 'Citizen'. Nâng/đổi vai trò (Cleaner, Inspector, CompanyStaff…) do quy trình mời/onboarding của LEO/CompanyManager/Admin.                                                                                                        | Authorization | N/A (Hệ thống tự gán)                                                                  |
| BR-AUTH-009 | Quyền quản trị vai trò            | Phân cấp: Admin gán mọi vai trò. DEO tạo CompanyManager trong phạm vi tỉnh (BR-CMP-001), onboard LEO. LEO mời Citizen thành Cleaner/Inspector (BR-ORG-020). CompanyManager thêm CompanyStaff (BR-CMP-010).                                                                 | Authorization | N/A (Chặn ở backend)                                                                   |
| BR-AUTH-010 | Trường bắt buộc                   | Các trường: Họ tên, email, mật khẩu là bắt buộc không được để trống. SĐT tùy chọn.                                                                                                                                                                                      | Validation    | Vui lòng điền đầy đủ thông tin bắt buộc                                                |
| BR-AUTH-011 | Định dạng Họ tên                  | Họ tên từ 2–50 ký tự, không chứa ký tự đặc biệt (trừ dấu tiếng Việt).                                                                                                                                                                                                   | Validation    | Họ tên không hợp lệ (từ 2-50 ký tự)                                                   |
| BR-AUTH-012 | Chấp nhận điều khoản              | Người dùng phải đồng ý 'Điều khoản sử dụng' và 'Chính sách quyền riêng tư' trước khi hoàn tất đăng ký.                                                                                                                                                                  | Compliance    | Bạn phải đồng ý với điều khoản để đăng ký                                              |
| BR-AUTH-013 | Google SSO                        | Hỗ trợ đăng nhập/đăng ký qua Google OAuth 2.0. Email từ Google tự động verified. Vai trò mặc định Citizen. GoogleId được liên kết vào tài khoản. Nếu email đã tồn tại, link GoogleId vào tài khoản hiện tại.                                                                | Security      | N/A (Tự động)                                                                          |
| **3.2 Đăng nhập (Login)** | | | | |
| BR-AUTH-014 | Thông tin đăng nhập               | Người dùng đăng nhập bằng email + mật khẩu, hoặc Google SSO. Hệ thống không phân biệt chữ hoa/thường với email.                                                                                                                                                          | Validation    | Thông tin đăng nhập không chính xác                                                    |
| BR-AUTH-015 | Giới hạn số lần sai mật khẩu      | Nhập sai mật khẩu quá 5 lần liên tiếp → khóa tài khoản tạm thời 30 phút. Phải gõ CAPTCHA từ lần sai thứ 3.                                                                                                                                                              | Security      | Tài khoản tạm bị khóa do đăng nhập sai nhiều lần. Thử lại sau 30 phút                  |
| BR-AUTH-016 | Tài khoản bị khóa/ban             | Tài khoản có IsBanned = true không được phép đăng nhập. Admin có thể ban/unban user. Tài khoản CompanyManager/CompanyStaff thuộc công ty không Active cũng bị chặn tác nghiệp (BR-CMP-005).                                                                               | Authorization | Tài khoản của bạn đã bị vô hiệu hóa. Liên hệ Admin                                    |
| BR-AUTH-017 | Phiên làm việc (session)          | Access token hết hạn sau 24 giờ; refresh token 30 ngày. Người dùng không hoạt động quá 30 phút trên web → tự đăng xuất. Refresh bị từ chối nếu công ty đã hết hạn (BR-CMP-005).                                                                                           | Security      | Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại                                      |
| BR-AUTH-018 | Phạm vi truy cập khách (Guest)    | Khách CHƯA đăng nhập CHỈ xem bản đồ công khai và thông tin hiển thị công khai (read-only). MỌI tính năng tương tác đều BẮT BUỘC đăng ký & đăng nhập. Hệ thống KHÔNG hỗ trợ gửi báo cáo ẩn danh (không tài khoản).                                                        | Authorization | Vui lòng đăng nhập để sử dụng tính năng này                                            |
| BR-AUTH-019 | Quên mật khẩu                     | Reset qua link email (hiệu lực 15 phút) hoặc OTP SĐT (hiệu lực 5 phút). Link/OTP chỉ dùng 1 lần.                                                                                                                                                                       | Security      | Link đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng                                  |
| BR-AUTH-020 | Mật khẩu tạm (Temp Password)      | Tài khoản được tạo bởi DEO (CompanyManager) hoặc CM (CompanyStaff) có MustChangePassword = true. Bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên.                                                                                                                          | Security      | Bạn cần đổi mật khẩu trước khi tiếp tục sử dụng                                       |
| **3.3 Quản lý hồ sơ (Profile)** | | | | |
| BR-AUTH-021 | Cập nhật thông tin cá nhân        | Người dùng chỉ được cập nhật: họ tên, ảnh đại diện. SĐT phải xác thực qua OTP. Email và vai trò không thể tự đổi.                                                                                                                                                       | Authorization | Không thể thay đổi email/vai trò. Liên hệ quản trị viên                                |
| BR-AUTH-022 | Đổi mật khẩu                      | Yêu cầu nhập mật khẩu cũ. Mật khẩu mới tuân thủ BR-AUTH-005.                                                                                                                                                                                                             | Security      | Mật khẩu mới không hợp lệ                                                              |
| BR-AUTH-023 | Xóa tài khoản (soft delete)       | Citizen có thể yêu cầu xóa tài khoản. Soft delete 90 ngày (Report.ReporterId → null, HideReporterName = true). Sau 90 ngày → AccountHardDeleteJob xóa vĩnh viễn.                                                                                                        | Compliance    | Tài khoản sẽ được xóa sau 90 ngày. Bạn có thể khôi phục trước thời hạn                 |
| BR-AUTH-024 | Khôi phục tài khoản               | Tài khoản đã soft delete có thể được khôi phục (RestoreAccount) trong vòng 90 ngày bằng cách đăng nhập lại với mật khẩu cũ.                                                                                                                                               | Business Logic | Tài khoản đã được khôi phục thành công                                                 |

# 4. Cơ cấu tổ chức & Định tuyến báo cáo (Organization & Routing)

Mô hình tổ chức 2 cấp (Department cấp Tỉnh; LocalOffice cấp Xã/Phường), cách định tuyến báo cáo theo địa giới hành chính, và cơ chế mời người vào đội.

## 4.1 Mô hình tổ chức tổng quan

- Department of Environmental Management (cấp Tỉnh/Thành phố) – đơn vị quản lý cấp cao; do DEO phụ trách.

- Local Environmental Office (cấp Xã/Phường) – trực thuộc Department; mỗi xã/phường có 1 LEO + 0..n Cleanup Team + 0..n Inspection Team.

- Environmental Service Company (ESC) – nhà cung cấp dịch vụ đầu nguồn (dọn dẹp), được DEO onboarding theo hợp đồng; phủ 1..n xã/phường (BR-CMP-*).

- Environmental Cleanup Team – đội dọn dẹp vật lý; thuộc một Company (đô thị) hoặc một Local Office (đội cộng đồng cấp xã/phường).

- Environmental Inspection Team – đội xử phạt vi phạm (thuộc Local Office); xử lý mọi loại ô nhiễm khi được LEO lập InspectionReport. InspectionTeam không thể thuộc company.

| ID          | Rule Name                                          | Description                                                                                                                                                                                                                                                                                           | Type          | Error Message / Behavior                         |
| ----------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------ |
| **Cấu trúc tổ chức 2 cấp** | | | | |
| BR-ORG-001  | Cấp 1 – Department                                | Department (cấp Tỉnh/Thành phố) là đơn vị cấp cao nhất, gắn 1-1 với Province. Quyền: xem báo cáo toàn tỉnh, quản lý hàng đợi chung, tái phân công LEO, onboarding công ty (BR-CMP), xem KPI tổng hợp.                                                                                                | Authorization | N/A                                               |
| BR-ORG-002  | Cấp 2 – Local Environmental Office                | LocalOffice trực thuộc Department, gắn 1-1 với Ward. Mỗi xã/phường có 1 LEO (OfficerId) và 0..n Cleanup Team, 0..n Inspection Team. LEO chỉ tiếp nhận báo cáo trong phạm vi xã/phường mình. IsOnboarded flag cho phép tắt/bật.                                                                         | Authorization | N/A                                               |
| BR-ORG-003  | Quan hệ Office – Team                             | Mỗi LocalOffice sở hữu 0..n đội cộng đồng (Cleanup/Inspection). Một Team chỉ thuộc 1 chủ thể (LocalOffice hoặc Company). TeamMember: 1 user → 1 team, IsLeader flag. Điều chuyển Team do Admin thực hiện (TransferToOffice).                                                                           | Data Integrity | N/A                                               |
| BR-ORG-004  | Phạm vi địa lý của Office                          | Mỗi LocalOffice gắn với WardCode → polygon GeoJSON tương ứng xã/phường. Hệ thống dùng WardCode/point-in-polygon để định tuyến.                                                                                                                                                                       | Data Integrity | N/A                                               |
| BR-ORG-005  | Mô hình dịch vụ đa đơn vị trong xã/phường          | Một xã/phường có thể có NHIỀU đơn vị: công ty đầu mối (ESC), đội cộng đồng (HTX/Tổ tự quản), ngang hàng. LEO điều phối từng báo cáo tới đơn vị phù hợp; hệ thống chỉ GỢI Ý.                                                                                                                          | Business Rule | N/A                                               |
| **Định tuyến báo cáo** | | | | |
| BR-ORG-010  | Định tuyến theo xã/phường (auto-routing)           | GPS hợp lệ → xác định WardCode → LocalOffice đã onboard → RouteToLocalOffice (AssignedOfficeId + AssignedDepartmentId). Chưa onboard → RouteToDepartment (chỉ AssignedDepartmentId, AssignedOfficeId = null).                                                                                           | Business Logic | N/A                                               |
| BR-ORG-011  | Hàng đợi chung cấp Tỉnh                           | Báo cáo thuộc xã/phường chưa onboard vào 'Department Common Queue'. DEO có quyền gán cho LEO gần nhất hoặc tự xử lý.                                                                                                                                                                                 | Business Logic | N/A                                               |
| BR-ORG-012  | Conflict of interest                               | DEO/LEO không được xác minh báo cáo do chính mình gửi. Báo cáo ngoài phạm vi xã/phường → LEO không có quyền tiếp nhận.                                                                                                                                                                               | Authorization | Bạn không có quyền tiếp nhận báo cáo ngoài khu vực |
| BR-ORG-013  | Quyết định xử lý khi xác minh                     | LEO xác minh → quyết ĐỘC LẬP 2 nhánh song song: (a) Cần dọn dẹp → gán Cleanup (đội Công ty / đội cộng đồng / Community Cleanup program). (b) Có chủ thể vi phạm → lập InspectionReport cho Inspection Team. Loại ô nhiễm chỉ tham chiếu/gợi ý, KHÔNG quyết định cứng đội xử lý.                         | Business Logic | N/A                                               |
| BR-ORG-014  | SLA tiếp nhận cấp xã/phường                        | LEO phải phản hồi (Accept/Reject) trong vòng 24 giờ. Quá hạn → escalate lên Department queue (EscalateToDepartment: AssignedOfficeId = null) và đánh dấu SlaVerifyBreached = true.                                                                                                                    | SLA           | Cảnh báo: Báo cáo [ID] vượt SLA tiếp nhận 24h    |
| BR-ORG-015  | Re-assign khi LEO reject                           | LEO 'Reject': lý do ≥ 20 ký tự. Report → Rejected. Citizen nhận thông báo kèm lý do.                                                                                                                                                                                                                 | Business Rule | Vui lòng nêu lý do từ chối ≥ 20 ký tự            |
| BR-ORG-016  | Định tuyến 2 bước & escalation                     | Bước 1: point-in-polygon → LEO tiếp nhận. Bước 2: LEO chọn đơn vị xử lý (app gợi ý). Escalation: tuyến cấp TP (cờ Admin/DEO) → đẩy lên DEO.                                                                                                                                                          | Business Logic | N/A                                               |
| **Mời người vào đội (Invitation)** | | | | |
| BR-ORG-020  | Mời thành viên đội cộng đồng                       | LEO tìm Citizen theo email → gửi StaffInvitation (vào Cleanup/Inspection Team). Khi Citizen CHẤP NHẬN: vai trò đổi (Cleaner/Inspector), thêm vào đội (TeamMember). InvitationStatus: Pending → Accepted/Declined/Expired/Cancelled. Audit log ghi mọi thay đổi vai trò.                                  | Business Process | N/A                                              |
| BR-ORG-021  | Hiệu lực lời mời                                  | Lời mời có hiệu lực 7 ngày (ExpiresAt = CreatedAt + 7d), dùng một lần (unique token). Quá hạn → Expired. LEO có thể Cancel lời mời trước khi Citizen phản hồi. Declined/Expired → giữ nguyên vai trò Citizen.                                                                                          | Business Process | Lời mời đã hết hạn hoặc đã được sử dụng           |

# 5. Quản lý báo cáo ô nhiễm (Pollution Report Management)

Vòng đời báo cáo từ khởi tạo, chuyển trạng thái đến xử lý trùng lặp. Một báo cáo có thể đồng thời sinh CleanupTask (ReportAssignment), Community Cleanup program, và InspectionReport.

| ID          | Rule Name                                   | Description                                                                                                                                                                                                                                                                                             | Type               | Error Message / Behavior                                       |
| ----------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------- |
| **5.1 Tạo báo cáo** | | | | |
| BR-REP-001  | Ảnh bắt buộc                                | Mỗi báo cáo phải có ít nhất 1 ảnh, tối đa 5 ảnh. Định dạng .jpg/.jpeg/.png/.webp, mỗi ảnh ≤ 10MB. Validate content-type bằng magic bytes (không tin extension).                                                                                                                                         | Validation         | Vui lòng thêm ít nhất 1 ảnh. Tối đa 5 ảnh, mỗi ảnh ≤ 10MB      |
| BR-REP-002  | Video (lựa chọn)                            | Tối đa 1 video. Định dạng mp4, mov.                                                                                                                                                                                                                                                                     | Validation         | Chỉ hỗ trợ 01 video định dạng MP4, MOV                          |
| BR-REP-003  | Tọa độ GPS bắt buộc                         | Latitude: 8.0–24.0; Longitude: 102.0–110.0 (lãnh thổ Việt Nam). Validate ở cả validator và DB check constraint.                                                                                                                                                                                         | Validation         | Vui lòng bật GPS. Vị trí phải nằm trong lãnh thổ Việt Nam       |
| BR-REP-004  | Mô tả báo cáo                               | Không bắt buộc, nếu nhập phải từ 10–1000 ký tự, qua bộ lọc từ cấm (BlockedWords, BR-ADM-006).                                                                                                                                                                                                           | Validation         | Mô tả phải từ 10–1000 ký tự / chứa nội dung không phù hợp       |
| BR-REP-005  | Loại ô nhiễm (3 loại)                       | Chọn đúng 1 PollutionCategory: Rác thải, Nước thải, Hóa chất. Loại ô nhiễm KHÔNG quyết định cứng đội xử lý (BR-ORG-013).                                                                                                                                                                                 | Validation         | Vui lòng chọn 1 loại ô nhiễm                                    |
| BR-REP-006  | Mức độ nghiêm trọng (Severity)              | Citizen chọn: Low / Medium / High / Critical. Mặc định Medium. LEO có thể override khi xác minh (SeveritySetBy = Officer). AI cũng gợi ý (AiEstimatedSeverity).                                                                                                                                         | Validation         | N/A                                                             |
| BR-REP-007  | Trạng thái khởi tạo                         | Report tạo mới luôn ở trạng thái Submitted. SlaVerifyDueAt = CreatedAt + 24h. Auto-routing chạy ngay (BR-ORG-010).                                                                                                                                                                                       | State Machine      | N/A                                                             |
| BR-REP-008  | Tùy chọn ẩn danh                            | Citizen có thể tick HideReporterName = true để ẩn tên hiển thị trên view công khai. Báo cáo vẫn gắn ReporterId (traced).                                                                                                                                                                                 | Privacy            | N/A                                                             |
| BR-REP-009  | Lưu bản nháp (Draft)                        | Citizen có thể lưu bản nháp (SaveDraft) trước khi submit. DraftCleanupJob xóa draft quá 30 ngày.                                                                                                                                                                                                         | Business Logic     | N/A                                                             |
| BR-REP-010  | Rate limit gửi báo cáo                      | Sliding window: 5 báo cáo/h, 20 báo cáo/24h per user. Dùng Redis sorted set.                                                                                                                                                                                                                            | Anti-Spam          | Bạn đã vượt quá giới hạn gửi báo cáo                            |
| **5.2 State machine** | | | | |
| BR-REP-020  | State machine chính                         | Submitted → Verified → InProgress → Resolved → Closed. Nhánh phụ: Submitted → Rejected, Submitted/Verified → Duplicate, Resolved → Reopened → InProgress (max 1 lần).                                                                                                                                    | State Machine      | Chuyển trạng thái không hợp lệ                                   |
| BR-REP-021  | Transition rules                            | Submitted → Verified: chỉ LEO/DEO (Verify). Submitted → Rejected: LEO (Reject, reason ≥ 20 chars). Verified/Reopened → InProgress: LEO assigns team / dispatches to company / opens Community Cleanup. InProgress → Resolved: khi tất cả cleanup assignments hoàn thành. Resolved → Closed: citizen confirm hoặc auto 2 ngày (AutoCloseResolvedReportJob). | State Machine      | N/A                                                             |
| BR-REP-022  | Lý do từ chối                               | LEO reject → RejectedReason ≥ 20 ký tự bắt buộc. Citizen nhận notification kèm lý do.                                                                                                                                                                                                                    | Validation         | Vui lòng nêu lý do ≥ 20 ký tự                                   |
| BR-REP-023  | Xóa báo cáo                                | Citizen chỉ xóa được khi Status = Submitted AND VerifiedBy = null AND AiClassifiedType = null. Soft delete.                                                                                                                                                                                               | Authorization      | Không thể xóa báo cáo đã được xác minh                          |
| BR-REP-024  | Auto-close (2 ngày)                          | Resolved > 2 ngày không có citizen feedback → AutoCloseResolvedReportJob tự Close. Citizen nhận ReportAutoClosed notification.                                                                                                                                                                             | Business Logic     | N/A (background job)                                             |
| **5.3 Reopen flow** | | | | |
| BR-REP-025  | Yêu cầu mở lại (Citizen)                    | Citizen gửi yêu cầu reopen khi Status = Resolved, trong 7 ngày sau ResolvedAt, chưa có pending request, ReopenedCount < 1. Yêu cầu phải kèm lý do + ít nhất 1 ảnh bằng chứng. Report.HasPendingReopenRequest = true.                                                                                      | Business Logic     | Không thể yêu cầu mở lại (quá hạn / đã mở lại / đang chờ duyệt) |
| BR-REP-026  | LEO duyệt mở lại                            | LEO approve → Resolved → Reopened. ReopenedCount++. Assignments reset (AssignedCompanyId = null, AssignedByOfficerId = null). SlaResolveDueAt tính lại. LEO phải gán team mới (Reopened → InProgress).                                                                                                      | State Machine      | N/A                                                             |
| BR-REP-027  | LEO từ chối mở lại                           | LEO reject → HasPendingReopenRequest = false. Report giữ Resolved. Citizen nhận notification.                                                                                                                                                                                                              | Business Logic     | N/A                                                             |
| **5.4 Duplicate detection** | | | | |
| BR-REP-030  | Phát hiện trùng lặp Tier 1 (geo+category)   | Khi submit, hệ thống kiểm tra: cùng PollutionCategory + trong 25m (PostGIS ST_DWithin) + báo cáo candidate chưa Closed/Rejected/Duplicate. Match → MarkPossibleDuplicate (IsPossibleDuplicate = true, DuplicateDetectionSource = "geo_category").                                                           | Business Logic     | N/A (async)                                                     |
| BR-REP-031  | Phát hiện trùng lặp Tier 2 (AI image compare) | CompareDuplicateImagesJob chạy background: so sánh ảnh new report vs candidate. Same scene → upgrade to "geo_category_ai" + AiSimilarityScore. Different → DismissDuplicate.                                                                                                                               | Business Logic     | N/A (background job)                                             |
| BR-REP-032  | LEO xác nhận trùng lặp                       | LEO xác nhận → MarkDuplicate(primaryReportId). Status → Duplicate. Primary report IncrementReporterCount. Comments/votes di chuyển sang primary (Comment.ReassignToReport). Citizen reporter duplicate nhận +5 points (PointReason.DuplicateReport).                                                         | Business Logic     | N/A                                                             |
| BR-REP-033  | LEO bác bỏ trùng lặp                        | LEO dismiss → DismissDuplicate. Report tiếp tục vòng đời bình thường.                                                                                                                                                                                                                                    | Business Logic     | N/A                                                             |
| **5.5 Violation recurrence** | | | | |
| BR-REP-034  | Phát hiện tái phát vi phạm                   | Báo cáo mới gần báo cáo đã Closed (cùng category, ≤25m, Closed trong 30 ngày) → MarkSuspectedViolationRecurrence. Mutually exclusive với IsPossibleDuplicate. LEO nhận ViolationRecurrenceReviewNeeded notification để so sánh và quyết định lập InspectionReport.                                          | Business Logic     | N/A                                                             |
| BR-REP-035  | LEO bác bỏ tái phát                          | LEO dismiss → DismissViolationRecurrence. Report tiếp tục bình thường.                                                                                                                                                                                                                                    | Business Logic     | N/A                                                             |
| **5.6 WasteTag & AI** | | | | |
| BR-REP-036  | WasteTag system                              | Officers tag báo cáo với 0..n WasteTag (HOUSEHOLD, MEDICAL, ANIMAL_CARCASS...) qua ReportWasteTag join table. Giúp cleanup team chuẩn bị thiết bị/bảo hộ phù hợp. WasteTag là lookup table do Admin quản lý (seed data, toggle active).                                                                    | Business Logic     | N/A                                                             |
| BR-REP-037  | AI waste tag suggestion                      | AI phân tích ảnh → gợi ý waste tag codes (Report.AiSuggestedWasteTagCodes, comma-separated). Officer có thể override.                                                                                                                                                                                     | Business Logic     | N/A                                                             |
| **5.7 Overdue & SLA** | | | | |
| BR-REP-038  | Report overdue                               | Submitted > 72h chưa Verified → MarkOverdue (IsOverdue = true). OverdueReportNotificationJob thông báo LEO/DEO.                                                                                                                                                                                           | SLA                | N/A (background job)                                             |
| BR-REP-039  | Content moderation                           | Admin có thể Hide/Unhide báo cáo (BR-ADM-006). IsHidden = true → ẩn khỏi public view. Reversible.                                                                                                                                                                                                        | Authorization      | N/A                                                             |
| BR-REP-040  | Force status (Admin)                         | Admin có thể ForceStatus — bypass state machine validation. Chỉ dùng trong trường hợp ngoại lệ. Ghi audit log.                                                                                                                                                                                           | Authorization      | N/A                                                             |

# 6. Bản đồ & Vị trí (Map & Location)

| ID          | Rule Name                      | Description                                                                                                                                                     | Type           | Error Message / Behavior |
| ----------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------ |
| BR-MAP-001  | GPS công khai làm tròn 10m     | GPS hiển thị công khai được làm tròn 4 chữ số thập phân (≈11m) để bảo vệ quyền riêng tư: Math.Round(lat, 4).                                                    | Privacy        | N/A                       |
| BR-MAP-002  | Cache map data 10 phút         | Map data cache ở Redis, key theo bbox + filters. TTL = 10 phút.                                                                                                  | Performance    | N/A                       |
| BR-MAP-003  | Lọc theo trạng thái/loại      | Bản đồ hỗ trợ lọc theo: ReportStatus, PollutionCategory, Severity, date range, ward/province.                                                                    | Business Logic | N/A                       |
| BR-MAP-004  | Heatmap & hotspot              | Hệ thống tạo heatmap dựa trên mật độ báo cáo. Sử dụng PostGIS clustering.                                                                                       | Business Logic | N/A                       |

# 7. Environmental Officer (DEO & LEO)

| ID          | Rule Name                         | Description                                                                                                                                                                                                                 | Type           | Error Message / Behavior                         |
| ----------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------ |
| BR-OFF-001  | Segregation of duties             | LEO/DEO không được xác minh báo cáo do chính mình gửi.                                                                                                                                                                      | Authorization  | Không thể xác minh báo cáo do chính bạn gửi     |
| BR-OFF-002  | SLA xác minh 24h                  | LEO phải verify/reject trong 24h. Vượt → SlaBreachVerificationJob đánh dấu SlaVerifyBreached, gửi SlaVerificationBreachedLeo notification cho LEO, escalate lên Department queue, gửi SlaVerificationEscalatedDeo cho DEO.      | SLA            | SLA breach notification                           |
| BR-OFF-003  | SLA xử lý (Resolution)            | SLA resolution theo severity: Critical 3d / High 5d / Medium 7d / Low 10d kể từ VerifiedAt. SlaBreachResolutionJob đánh dấu SlaResolveBreached.                                                                               | SLA            | N/A (background job)                              |
| BR-OFF-004  | Priority score                    | PriorityScore = severity*3 + reporterCount*2 + ageInHours/24. PriorityScoreRefreshJob tính lại định kỳ. Dùng để sắp xếp hàng đợi LEO.                                                                                         | Business Logic | N/A                                               |
| BR-OFF-005  | Gán team dọn dẹp                  | LEO gán community Cleanup Team → Verified/Reopened → InProgress. Hỗ trợ multi-team (nhiều ReportAssignment per report).                                                                                                       | Business Logic | N/A                                               |
| BR-OFF-006  | Dispatch to company               | LEO dispatch báo cáo cho EnvironmentalServiceCompany → InProgress. CompanyManager phân công company team cụ thể (AssignByCompanyManager).                                                                                      | Business Logic | N/A                                               |
| BR-OFF-007  | Lập InspectionReport              | LEO tạo InspectionReport gắn với báo cáo Verified. Song song với cleanup. Severity report quyết định SLA inspection (BR-INS-030).                                                                                               | Business Logic | N/A                                               |
| BR-OFF-008  | KPI LEO                           | Metrics: tổng báo cáo verified, thời gian trung bình xác minh, SLA breach %, tỷ lệ resolved.                                                                                                                                 | Business Logic | N/A                                               |
| BR-OFF-009  | Escalate report to Department     | LEO có thể escalate báo cáo lên Department queue (EscalateToDepartment — clear AssignedOfficeId).                                                                                                                               | Business Logic | N/A                                               |

# 8. Environmental Cleanup Team (BR-CLN)

| ID          | Rule Name                        | Description                                                                                                                                                                                                              | Type           | Error Message / Behavior                                     |
| ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------ |
| BR-CLN-001  | Gán đội dọn dẹp                  | LEO/CM gán team qua ReportAssignment. Assignment status: Assigned → InProgress → Completed/Escalated/Declined.                                                                                                            | Business Logic | N/A                                                           |
| BR-CLN-002  | Check-in tại hiện trường          | Team check-in bằng GPS (CheckIn method). AssignmentStatus: Assigned → InProgress. Ghi CheckedInLatitude, CheckedInLongitude. Khoảng cách ≤ 200m (PostGIS ST_DWithin).                                                      | Business Logic | Bạn phải ở trong phạm vi 200m từ điểm báo cáo                 |
| BR-CLN-003  | Accept assignment                 | Team leader accept (không cần check-in GPS) → Assigned → InProgress. StartedAt set khi accept.                                                                                                                            | Business Logic | N/A                                                           |
| BR-CLN-004  | Upload ảnh before/after           | Team upload ảnh trước/sau dọn dẹp. Before images qua UploadBeforeImages. Progress images qua UploadProgressImage. Validate content-type.                                                                                    | Validation     | N/A                                                           |
| BR-CLN-005  | Cập nhật tiến độ                  | UpdateProgress(percent, note, userId). Percent 0-100. Status phải InProgress. CleanupProgressSlaJob: stale > 48h → thông báo LEO (CleanupProgressStale).                                                                     | Business Logic | N/A                                                           |
| BR-CLN-006  | Escalate                          | Team escalate khi vượt khả năng → Escalate(reason). AssignmentStatus → Escalated. LEO nhận notification để re-assign.                                                                                                      | Business Logic | N/A                                                           |
| BR-CLN-007  | Decline assignment                | Team decline trong 2h window → Decline(reason). AssignmentStatus → Declined. LEO nhận CleanupTaskDeclined notification.                                                                                                    | Business Logic | N/A                                                           |
| BR-CLN-008  | ForceDecline (cascade)            | BR-CMP-013: Khi công ty bị deactivate, system ForceDecline tất cả assignments Assigned/InProgress của công ty. Report RevertToVerified.                                                                                     | Business Logic | N/A (system action)                                           |
| BR-CLN-009  | Complete assignment               | Team complete → Complete(). AssignmentStatus → Completed. CompletedAt set.                                                                                                                                                  | Business Logic | N/A                                                           |

# 9. Community Cleanup Program (BR-CMU) — NEW v2.0

Chương trình dọn dẹp cộng đồng do LEO mở trên báo cáo Verified. Cleaner Leader dẫn dắt, Citizen đăng ký tham gia.

State machine: OpenForJoin → JoinClosed → InProgress → PendingVerification → Completed. Hoặc: Any (except Completed) → Cancelled.

| ID          | Rule Name                           | Description                                                                                                                                                                                                                    | Type           | Error Message / Behavior                                      |
| ----------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------- |
| BR-CMU-001  | LEO mở chương trình                 | LEO tạo CommunityCleanupEvent gắn với báo cáo Verified. Chỉ định Cleaner làm Leader (LeaderUserId, LeaderTeamId). Yêu cầu: title, startsAt, maxParticipants. Report → InProgress (StartCommunityCleanup).                       | Business Logic | N/A                                                            |
| BR-CMU-002  | Chỉ 1 event active per report       | Mỗi Report chỉ có tối đa 1 CommunityCleanupEvent active (IsActive = Status not Completed/Cancelled) tại một thời điểm.                                                                                                        | Business Logic | Báo cáo này đã có chương trình dọn dẹp cộng đồng đang hoạt động |
| BR-CMU-003  | Citizen tham gia (Join)             | Citizen đăng ký tham gia khi Status = OpenForJoin và chưa đạt MaxParticipants. Tạo CommunityCleanupParticipant.                                                                                                                 | Business Logic | Chương trình đã đầy / Đã đăng ký                               |
| BR-CMU-004  | Citizen rút khỏi (Withdraw)        | Citizen có thể rút khỏi trước khi event InProgress. ParticipantStatus → Withdrawn.                                                                                                                                              | Business Logic | Không thể rút khi chương trình đang diễn ra                    |
| BR-CMU-005  | Đóng đăng ký (CloseJoin)           | LEO đóng đăng ký sớm, hoặc job tự đóng khi JoinClosesAt đến. OpenForJoin → JoinClosed.                                                                                                                                          | Business Logic | N/A                                                            |
| BR-CMU-006  | Bắt đầu (Start)                    | Leader start event. {OpenForJoin, JoinClosed} → InProgress. Raises CommunityCleanupStartedEvent → thông báo participants.                                                                                                       | State Machine  | N/A                                                            |
| BR-CMU-007  | Check-in participant                | Citizen check-in tại điểm hẹn (MeetingLatitude/Longitude). GPS ≤ 500m. ParticipantStatus → CheckedIn.                                                                                                                           | Business Logic | Bạn phải ở trong phạm vi 500m từ điểm hẹn                      |
| BR-CMU-008  | Cập nhật tiến độ (Leader)           | Leader update progress (percent, note). Percent chỉ tăng, không giảm. Raises CommunityCleanupProgressUpdatedEvent.                                                                                                               | Business Logic | Tiến độ không thể giảm                                         |
| BR-CMU-009  | Submit evidence (Leader)            | Leader submit bằng chứng hoàn thành. InProgress → PendingVerification. Raises event thông báo LEO.                                                                                                                               | State Machine  | N/A                                                            |
| BR-CMU-010  | LEO approve                         | LEO xác nhận hoàn thành. PendingVerification → Completed. Raises CommunityCleanupCompletedEvent → Report.Resolve(). Participants nhận gamification points (+15, PointReason.CommunityCleanupParticipation).                       | State Machine  | N/A                                                            |
| BR-CMU-011  | LEO reject                          | LEO từ chối bằng chứng (reason ≥ 20 chars). PendingVerification → InProgress. Leader nhận CommunityCleanupVerificationRejectedEvent. Leader phải gửi lại.                                                                       | State Machine  | N/A                                                            |
| BR-CMU-012  | LEO cancel                          | LEO hủy chương trình. Any (except Completed) → Cancelled. CancelReason bắt buộc.                                                                                                                                                 | State Machine  | Không thể hủy chương trình đã hoàn thành                       |
| BR-CMU-013  | Nhắc check-in                       | CommunityCleanupCheckInReminderJob gửi reminder ~15 phút trước StartsAt cho participants chưa check-in.                                                                                                                          | Business Logic | N/A (background job)                                           |

# 10. Environmental Inspection Team (BR-INS)

InspectionReport — sub-process chạy song song với Report. LEO lập khi phát hiện vi phạm.

State machine: Draft → InProgress (AcceptTask) → PenaltyIssued → Paid → Closed. Nhánh phụ: InProgress → ClosedNoViolation (BR-INS-013). PenaltyIssued → Overdue. Overdue → Paid → Closed. Draft/InProgress → ClosedNoViolation (ForceClose khi SLA hết hạn).

| ID          | Rule Name                            | Description                                                                                                                                                                                                                                 | Type           | Error Message / Behavior                                          |
| ----------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------- |
| BR-INS-001  | Tạo InspectionReport                 | LEO tạo InspectionReport gắn ReportId. Status = Draft. SLA tính theo report severity (BR-INS-030). Có thể gán team ngay hoặc sau.                                                                                                            | Business Logic | N/A                                                                |
| BR-INS-002  | Gán Inspection Team                  | LEO gán team (AssignTeam). Chỉ cho phép ở Draft/InProgress. InspectionTeam phải thuộc LocalOffice (không thuộc company).                                                                                                                      | Business Logic | N/A                                                                |
| BR-INS-003  | Decline inspection task              | Team decline → ReportAssignment.Decline(reason). LEO nhận InspectionTaskDeclined notification. LEO phải gán team khác (ClearTeam → re-assign).                                                                                                | Business Logic | N/A                                                                |
| **Checklist workflow (BR-INS-033)** | | | | |
| BR-INS-004  | Accept task                          | Team leader accept → Draft → InProgress. AcceptedAt, AcceptedByUserId set. AcceptTask requires AssignedTeamId != null.                                                                                                                       | State Machine  | N/A                                                                |
| BR-INS-005  | Confirm arrival                      | GPS arrival confirmation (ConfirmArrival). InProgress only. Ghi ArrivalLatitude/Longitude. Distance ≤ 200m (handler validates). Note required when > 200m.                                                                                   | Business Logic | N/A                                                                |
| BR-INS-006  | Submit field investigation           | Team Leader submits field investigation (SubmitFieldInvestigation). InProgress only. Chỉ submit 1 lần. FieldInvestigationSubmittedAt set.                                                                                                     | Business Logic | Báo cáo điều tra đã được nộp trước đó                              |
| BR-INS-007  | Upload evidence                      | Team upload evidence photos/documents (InspectionEvidence). Liên kết với InspectionReport.                                                                                                                                                    | Business Logic | N/A                                                                |
| BR-INS-008  | Update inspection details            | LEO/Inspector cập nhật ViolationDescription, ViolatorName, ViolatorAddress, ViolatorIdentity. Chỉ ở Draft/InProgress.                                                                                                                         | Business Logic | N/A                                                                |
| **Penalty** | | | | |
| BR-INS-010  | ViolatingEntity                      | Entity chuẩn hóa đối tượng vi phạm: cá nhân (IdentityNumber = CMND/CCCD) hoặc doanh nghiệp (TaxCode). Linked vào InspectionReport qua ViolatingEntityId. Thay thế string-matching cho repeat offender detection.                               | Data Integrity | N/A                                                                |
| BR-INS-011  | Violation level                      | 4 mức: Minor (nhẹ — cảnh cáo), Moderate (trung bình), Severe (nặng), Critical (đặc biệt nghiêm trọng). Admin cấu hình penalty amount ranges per level per category (PenaltyFramework, BR-ADM-008).                                              | Business Logic | N/A                                                                |
| BR-INS-012  | Issue penalty                        | Inspector (Team Leader) issue penalty → InProgress → PenaltyIssued. REQUIRES FieldInvestigationSubmittedAt (phải submit field investigation trước). PenaltyAmount > 0, PenaltyDecisionNumber, PenaltyDueDate bắt buộc.                           | State Machine  | Phải nộp báo cáo điều tra trước khi ra quyết định xử phạt         |
| BR-INS-013  | Đóng không vi phạm                   | InProgress → ClosedNoViolation. REQUIRES FieldInvestigationSubmittedAt. ClosedReason ≥ 50 ký tự. Citizen nhận InspectionClosedNoViolation notification.                                                                                        | State Machine  | Lý do đóng phải ≥ 50 ký tự                                        |
| BR-INS-020  | Ghi nhận nộp phạt (full payment)     | PenaltyPayment: ghi nhận tại phường/xã. Chỉ chấp nhận đúng số tiền còn lại (payment.Amount == PenaltyAmount - PaidAmount). PenaltyIssued/Overdue → Paid. KHÔNG hỗ trợ nộp từng phần.                                                          | Business Logic | Số tiền nộp phải đúng bằng số tiền còn lại                        |
| BR-INS-021  | Quá hạn nộp phạt                     | PenaltyPaymentOverdueJob: khi PenaltyDueDate < now → MarkOverdue. PenaltyIssued → Overdue. Gửi PenaltyPaymentOverdue notification.                                                                                                            | SLA            | N/A (background job)                                               |
| BR-INS-022  | Repeat offender detection            | Query InspectionReport by ViolatingEntityId. IsRepeatOffender flag set khi issue penalty cho violator đã có record trước.                                                                                                                      | Business Logic | N/A                                                                |
| BR-INS-023  | Đóng hồ sơ                           | Paid → Closed. ClosedAt set. Inspector nhận InspectionPenaltyPaidAndClosed notification.                                                                                                                                                       | State Machine  | N/A                                                                |
| BR-INS-024  | Xóa payment                          | RemovePayment: reverse payment, adjust PaidAmount. Status recalc: 0 → PenaltyIssued/Overdue, partial → PartiallyPaid, full → Paid.                                                                                                            | Business Logic | N/A                                                                |
| BR-INS-025  | ForceCloseNoViolation (SLA auto)     | Khi SLA hết hạn, SlaBreachInspectionJob có thể ForceCloseNoViolation cho Draft/InProgress. Không yêu cầu FieldInvestigation. Reason ≥ 50 chars.                                                                                                | SLA            | N/A (background job)                                               |
| **SLA** | | | | |
| BR-INS-030  | SLA inspection                       | SLA deadline theo severity: Critical 3d / High 5d / Medium 7d / Low 10d. SlaInspectionDueAt tính từ thời điểm tạo. SlaBreachInspectionJob đánh dấu SlaInspectionBreached.                                                                      | SLA            | N/A (background job)                                               |
| BR-INS-031  | Progress tracking                    | UpdateProgress(percent, note) while InProgress. 0-100%.                                                                                                                                                                                        | Business Logic | N/A                                                                |
| BR-INS-033  | Inspection checklist                 | Workflow bắt buộc: AcceptTask → ConfirmArrival (optional) → SubmitFieldInvestigation → IssuePenalty/CloseNoViolation. Field investigation phải submit trước khi ra quyết định cuối cùng.                                                       | Business Logic | N/A                                                                |

# 11. Công ty Dịch vụ Môi trường (BR-CMP)

| ID          | Rule Name                          | Description                                                                                                                                                                                                                                | Type           | Error Message / Behavior                                       |
| ----------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | -------------------------------------------------------------- |
| BR-CMP-001  | Tạo công ty                        | DEO tạo EnvironmentalServiceCompany với contract info. 2 loại: Subsidiary (trực thuộc, vô thời hạn) và Bidding (đấu thầu, có thời hạn). Status = PendingActivation.                                                                          | Business Logic | N/A                                                             |
| BR-CMP-002  | Onboarding CompanyManager          | DEO tạo User (CompanyManager) với MustChangePassword = true. CM đặt mật khẩu qua cơ chế reset-password chung.                                                                                                                               | Business Logic | N/A                                                             |
| BR-CMP-003  | Kích hoạt công ty                  | DEO activate → PendingActivation → Active. ActivatedAt set.                                                                                                                                                                                  | State Machine  | N/A                                                             |
| BR-CMP-004  | State machine công ty              | PendingActivation → Active → Suspended ↔ Active. Active → Terminated. Active → Expired (background job khi hết hạn). Expired → Active (RenewContract).                                                                                       | State Machine  | N/A                                                             |
| BR-CMP-005  | Hiệu lực tác nghiệp               | Chỉ Company.Status == Active mới nhận được task dispatch. CompanyStaff thuộc công ty không Active bị chặn tác nghiệp.                                                                                                                        | Authorization  | Công ty hiện không hoạt động                                    |
| BR-CMP-006  | Gia hạn hợp đồng                   | DEO gia hạn hợp đồng Bidding (RenewContract). Tạo ContractPeriod mới. Auto-reactivate từ Expired. Subsidiary không thể renew (vô thời hạn).                                                                                                  | Business Logic | Subsidiary contracts are indefinite — cannot renew              |
| BR-CMP-007  | Cảnh báo hết hạn                   | CompanyContractExpiryJob: cảnh báo 30d/7d/1d trước hết hạn (Bidding). Khi hết hạn → Expire(). LastExpiryWarningAt cho idempotency.                                                                                                           | Business Logic | N/A (background job)                                            |
| BR-CMP-008  | Company teams                      | CM tạo company teams (CreateCompanyTeam). CompanyId set. LocalOfficeId = null (company team đi theo task). InspectionTeam KHÔNG thể thuộc company.                                                                                             | Business Logic | InspectionTeam là đội xử phạt phường/xã, không thể thuộc công ty |
| BR-CMP-009  | CompanyStaff                       | CM thêm CompanyStaff. Link User ↔ Company. Activate/Deactivate staff.                                                                                                                                                                         | Business Logic | N/A                                                             |
| BR-CMP-010  | ServiceAreas                       | DEO/CM quản lý CompanyServiceArea (N–N relationship Company ↔ LocalOffice). Xác định phạm vi phục vụ.                                                                                                                                         | Business Logic | N/A                                                             |
| BR-CMP-011  | Archive company                    | Chỉ archive khi: Terminated, hoặc PendingActivation + no staff. Soft delete.                                                                                                                                                                  | Business Logic | Company must be terminated before archiving                     |
| BR-CMP-012  | Archive team                       | Chỉ archive khi không có active assignments. Deactivate → SoftDelete.                                                                                                                                                                          | Business Logic | Cannot archive team with active assignments                     |
| BR-CMP-013  | Cascade deactivation               | Khi công ty bị suspend/expire/terminate: ForceDecline tất cả Assigned/InProgress assignments. Report.RevertToVerified cho các report bị ảnh hưởng.                                                                                              | Business Logic | N/A (system action)                                             |

# 12. Thông báo & Bình luận (BR-NTF, BR-CMT)

## 12.1 Thông báo (Notifications)

| ID          | Rule Name                     | Description                                                                                                                                                                            | Type           | Error Message / Behavior |
| ----------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------ |
| BR-NTF-001  | Kênh thông báo                 | 2 kênh: FCM Push + Email. NotificationChannel enum: InApp, Email, Push, Both. User.FcmDeviceToken cho push. DispatchNotificationChannelsJob gửi batch.                                   | Business Logic | N/A                       |
| BR-NTF-002  | Sự kiện trigger (40+ loại)     | NotificationType enum: ReportStatusChanged, NewComment, BadgeEarned, LevelUp, SlaVerificationBreachedLeo, SlaVerificationEscalatedDeo, SlaResolutionBreached, SlaInspectionBreached, InspectionTaskAssigned/Accepted/Declined, CleanupTaskAssigned/Accepted/Declined, CommunityCleanup* (7 loại), ReportOverdue, ReportUnassigned, ReportAutoClosed, DuplicateReviewNeeded, ViolationRecurrenceReviewNeeded, ReopenReviewNeeded, ReopenRequestDecided, StaffInvitationReceived/Accepted/Declined, ContractExpiryWarning, ContractExpired, v.v. | Business Logic | N/A |
| BR-NTF-003  | Anti-spam digest               | Queue notification, gom cuối ngày nếu > 20/loại/user.                                                                                                                                  | Anti-Spam      | N/A                       |
| BR-NTF-004  | Ngôn ngữ thông báo             | User.Language (mặc định vi-VN). Hệ thống dùng NotificationTemplate (BR-ADM-007) để sinh nội dung đa ngôn ngữ.                                                                          | Business Logic | N/A                       |
| BR-NTF-005  | Read/unread tracking           | Notification.IsRead, ReadAt. MarkAsRead() method.                                                                                                                                       | Business Logic | N/A                       |
| BR-NTF-006  | Idempotency                    | PushDispatchedAt, EmailDispatchedAt — Hangfire retry không gửi trùng.                                                                                                                    | Business Logic | N/A                       |

## 12.2 Bình luận (Comments)

| ID          | Rule Name                     | Description                                                                                                                                                                   | Type           | Error Message / Behavior                           |
| ----------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------- |
| BR-CMT-001  | Bình luận báo cáo              | Citizen/staff bình luận trên báo cáo. Content 1–500 ký tự (trim). Hỗ trợ reply (ParentCommentId, TikTok-style). Bắt buộc đăng nhập.                                            | Validation     | Bình luận phải từ 1-500 ký tự                        |
| BR-CMT-002  | Comment media                  | Bình luận có thể đính kèm ảnh/video (CommentMedia). Validate format + size.                                                                                                    | Validation     | N/A                                                 |
| BR-CMT-003  | Profanity filter               | Bộ lọc từ cấm (BlockedWords, BR-ADM-006). Vi phạm 3 lần → CommentBannedUntil = now + 7 ngày (User.RecordCommentViolation).                                                     | Anti-Spam      | Bạn bị cấm bình luận tạm thời do vi phạm quy định   |
| BR-CMT-004  | Edit/delete window             | Author chỉ sửa/xóa trong 15 phút kể từ khi đăng. Hidden comments không sửa được. LEO/Admin có thể Hide comment bất cứ lúc nào (reason ≥ 10 chars).                              | Business Logic | Đã hết thời gian chỉnh sửa/xóa                      |
| BR-CMT-005  | Comment likes                  | Users có thể like comment (CommentLike). Toggle like/unlike.                                                                                                                    | Business Logic | N/A                                                 |
| BR-CMT-006  | Migrate comments on duplicate  | Khi merge duplicate (BR-REP-032): Comment.ReassignToReport(primaryReportId) chuyển comments sang primary.                                                                        | Business Logic | N/A                                                 |

# 13. Gamification (BR-GAM)

| ID          | Rule Name                     | Description                                                                                                                                                                                    | Type           | Error Message / Behavior |
| ----------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------ |
| BR-GAM-001  | Điểm thưởng (Points)          | UserPoints aggregate root (1 per Citizen). Point awards: ReportVerified +10, ReportResolved +20, PenaltyIssued +20, DuplicateReport +5, CommunityCleanupParticipation +15, ReportRejected -5.     | Business Logic | N/A                       |
| BR-GAM-002  | Idempotent award               | AwardPoints idempotent: same ReportId + same Reason → skip (đã awarded).                                                                                                                        | Business Logic | N/A                       |
| BR-GAM-003  | Levels                         | L1 (0–99), L2 (100–499), L3 (500–1499), L4 (1500–4999), L5 (≥5000). LevelUpEvent raised when level increases.                                                                                    | Business Logic | N/A                       |
| BR-GAM-004  | Badges                         | Badge catalog (seed data): milestone (first_report, eco_warrior, green_champion, earth_guardian), streak (streak_7d, streak_30d), community (hotspot_hunter, duplicate_finder, community_voice), level (rising_star, eco_expert, green_legend). Auto-awarded based on RequiredPoints, RequiredReportCount, RequiredStreakDays. | Business Logic | N/A |
| BR-GAM-005  | Featured badge                 | Citizen chọn 1 badge hiển thị nổi bật trên hồ sơ (User.FeaturedBadgeId). Phải sở hữu badge đó.                                                                                                  | Business Logic | N/A                       |
| BR-GAM-006  | Lock gamification (fraud)      | Admin lock gamification: Lock(reason, lockDays=30). Deduct all points (FraudPenalty transaction). IsLocked = true, LockedUntil set. Auto-unlock khi hết hạn.                                       | Anti-Fraud     | N/A                       |
| BR-GAM-007  | Leaderboard                    | LeaderboardSnapshotJob chụp snapshot daily/weekly/monthly. Hiển thị ranking Citizen theo TotalPoints.                                                                                              | Business Logic | N/A                       |
| BR-GAM-008  | Streak calculator              | ReportStreakCalculator tính chuỗi ngày liên tiếp gửi báo cáo verified. Dùng cho badge streak_7d, streak_30d.                                                                                      | Business Logic | N/A                       |

# 14. AI Service (BR-AI)

| ID          | Rule Name                     | Description                                                                                                                                                    | Type           | Error Message / Behavior       |
| ----------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------ |
| BR-AI-001   | Phân loại ảnh                  | AI phân tích ảnh báo cáo → AiClassifiedType (loại ô nhiễm), AiConfidence (0.0–1.0), AiEstimatedSeverity. AiPending flag cho async processing.                    | Business Logic | N/A                             |
| BR-AI-002   | Duplicate image compare        | CompareDuplicateImagesJob: AI so sánh ảnh 2 báo cáo → same scene / different scene + confidence score.                                                          | Business Logic | N/A                             |
| BR-AI-003   | WasteTag suggestion            | AI gợi ý waste tag codes dựa trên ảnh (Report.AiSuggestedWasteTagCodes). Officer override.                                                                      | Business Logic | N/A                             |
| BR-AI-004   | Anti-fraud (EXIF suspicion)    | ExifSuspicionEvaluator kiểm tra EXIF metadata: nghi vấn ảnh chỉnh sửa, ảnh từ internet. Report.FlagSuspicious(reasons).                                          | Anti-Fraud     | N/A                             |
| BR-AI-005   | Timeout & retry                | AI timeout 5s → AiPending = true, fallback queue retry trong 1h. Background job retry.                                                                          | Performance    | N/A                             |

# 15. Quản trị hệ thống (BR-ADM)

| ID          | Rule Name                     | Description                                                                                                                                                                          | Type           | Error Message / Behavior |
| ----------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | ------------------------ |
| BR-ADM-001  | Quản lý user (8 roles)         | Admin CRUD tất cả user. 8 human roles: Citizen, DEO, LEO, CompanyManager, CompanyStaff, Cleaner, Inspector, Admin.                                                                     | Authorization | N/A                       |
| BR-ADM-002  | Ban/unban user                 | Admin toggle IsBanned. User bị ban không đăng nhập được (BR-AUTH-016).                                                                                                                 | Authorization | N/A                       |
| BR-ADM-003  | Quản lý PollutionCategory      | Admin CRUD danh mục ô nhiễm (3 loại: Rác thải, Nước thải, Hóa chất). Archive (soft delete) category.                                                                                   | Business Logic | N/A                       |
| BR-ADM-004  | Quản lý WasteTag               | Admin CRUD WasteTag (seed data). Toggle IsActive. DisplayOrder cho sắp xếp.                                                                                                            | Business Logic | N/A                       |
| BR-ADM-005  | Quản lý Badge                  | Admin quản lý badge catalog. Auto-awarded based on criteria (BR-GAM-004).                                                                                                               | Business Logic | N/A                       |
| BR-ADM-006  | Content moderation             | BlockedWords: danh sách từ cấm cho filter bình luận + mô tả. Admin Hide/Unhide reports (BR-REP-039). Admin Hide comments (BR-CMT-004).                                                  | Anti-Spam      | N/A                       |
| BR-ADM-007  | Notification templates         | Admin quản lý NotificationTemplate cho từng NotificationType + ngôn ngữ. Placeholders substitution.                                                                                      | Business Logic | N/A                       |
| BR-ADM-008  | Penalty framework              | PenaltyFramework: Admin cấu hình Min/MaxAmount per PollutionCategory per ViolationLevel. EffectiveFrom/To date. Existing issued penalties không bị ảnh hưởng khi update.                  | Business Logic | N/A                       |
| BR-ADM-009  | Gamification configs            | Admin cấu hình point values per action, badge thresholds. GamificationConfigs feature.                                                                                                   | Business Logic | N/A                       |
| BR-ADM-010  | Audit log                       | Mọi thay đổi role, status, configuration ghi audit log. AuditLogRetentionJob cleanup (DataRetentionJob). Truy vấn qua AuditLogs feature.                                                | Auditability   | N/A                       |
| BR-ADM-011  | Onboard LocalOffice             | Admin/DEO tạo LocalOffice gắn WardCode + DepartmentId. Assign LEO.                                                                                                                      | Business Logic | N/A                       |
| BR-ADM-012  | Force status                    | Admin ForceUpdateReportStatus — bypass state machine. Emergency only. Ghi audit log.                                                                                                     | Authorization  | N/A                       |
| BR-ADM-013  | Spam dashboard                  | SpamDashboard feature: tổng hợp thống kê spam, flagged reports, banned users.                                                                                                            | Business Logic | N/A                       |

# 16. Dữ liệu & Quyền riêng tư (BR-DAT)

| ID          | Rule Name                     | Description                                                                                                                                                           | Type       | Error Message / Behavior                                 |
| ----------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------- |
| BR-DAT-001  | Mã hóa mật khẩu               | bcrypt cost ≥ 12. AES-256 at-rest cho secrets (Data Protection API).                                                                                                   | Security   | N/A                                                       |
| BR-DAT-002  | Soft delete                    | User, Report, Comment: soft delete mặc định. Cột DeletedAt nullable + global query filter.                                                                              | Compliance | N/A                                                       |
| BR-DAT-003  | Data retention                 | DataRetentionJob: xóa audit logs cũ, anonymize data theo policy. RPO ≤ 24h, RTO ≤ 4h.                                                                                   | Compliance | N/A                                                       |
| BR-DAT-004  | Account hard delete            | AccountHardDeleteJob: soft-deleted > 90 ngày → xóa vĩnh viễn. Report data retain (ReporterId = null, anonymized).                                                       | Compliance | N/A                                                       |
| BR-DAT-005  | Data consent                   | User.HasDataConsent, ConsentAcceptedAt. User phải đồng ý xử lý dữ liệu (ảnh, GPS) trước khi gửi báo cáo. AcceptDataConsent() method.                                     | Compliance | Bạn cần đồng ý chính sách xử lý dữ liệu trước khi tiếp tục |

# 17. Phi chức năng (BR-SYS)

| ID          | Rule Name                     | Description                                                                                                                     | Type          | Error Message / Behavior            |
| ----------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------- |
| BR-SYS-001  | API response time              | p95 < 2s ở tải đỉnh.                                                                                                            | Performance   | N/A                                  |
| BR-SYS-002  | Object storage                 | Ảnh/video lưu AWS S3 qua presigned URL (client → S3 trực tiếp).                                                                  | Performance   | N/A                                  |
| BR-SYS-003  | Uptime                         | ≥ 99.5%/tháng.                                                                                                                   | Availability  | N/A                                  |
| BR-SYS-004  | Rate limit                     | 60 rpm/IP anon, 300 rpm/user authed. ASP.NET Core RateLimiterMiddleware.                                                          | Security      | Quá nhiều yêu cầu. Vui lòng thử lại |
| BR-SYS-005  | Scale                          | 5,000 concurrent users; 100,000+ reports.                                                                                         | Scalability   | N/A                                  |
| BR-SYS-006  | i18n                           | vi-VN, en-US. User.Language preference.                                                                                           | Business Logic | N/A                                  |

# Phụ lục A — Report State Machine

```
                            ┌──► Rejected   (LEO, reason ≥ 20 chars)
                            │
    Submitted ──────────────┼──► Verified ──┬──► InProgress ──► Resolved ──┬──► Closed
                            │               │       ▲                      │     (auto 2d or citizen)
                            └──► Duplicate  │       │                      │
                                            │       └── Reopened ◄─────────┘
                                            │            (LEO approve, max 1x, 7d window)
                                            │
                                            └──► InProgress (via Community Cleanup / Company dispatch)
```

Transition details:
- Submitted → Verified: LEO/DEO verify (SeveritySetBy = Officer nếu override)
- Submitted → Rejected: LEO (RejectedReason ≥ 20 chars)
- Submitted/Verified → Duplicate: LEO/AI confirm duplicate
- Verified/Reopened → InProgress: LEO assigns team / dispatches company / opens Community Cleanup
- InProgress → Resolved: khi cleanup assignments complete
- Resolved → Closed: citizen confirm hoặc auto 2 ngày (AutoCloseResolvedReportJob)
- Resolved → Reopened: citizen request + LEO approve (max 1 lần, trong 7 ngày)
- Reopened → InProgress: LEO re-assigns

# Phụ lục B — InspectionReport State Machine

```
    Draft ──► InProgress ──┬──► PenaltyIssued ──┬──► Paid ──► Closed
              (AcceptTask)  │                     │
                            │                     └──► Overdue ──► Paid ──► Closed
                            │
                            └──► ClosedNoViolation (reason ≥ 50 chars)

    Draft/InProgress ──► ClosedNoViolation (ForceClose — SLA auto-close)
```

Checklist workflow: AcceptTask → ConfirmArrival (optional) → SubmitFieldInvestigation → {IssuePenalty | CloseNoViolation}

SLA: Critical 3d / High 5d / Medium 7d / Low 10d.

# Phụ lục C — Community Cleanup State Machine

```
    OpenForJoin ──┬──► JoinClosed ──► InProgress ──► PendingVerification ──┬──► Completed
                  │                        ▲                                │
                  │                        └── (LEO reject, re-try)────────┘
                  └──► InProgress (Leader start early)
    
    Any (except Completed) ──► Cancelled (LEO cancel)
```

# Phụ lục D — Background Jobs Mapping

| Job                                  | Schedule        | BR liên quan                        |
| ------------------------------------ | --------------- | ----------------------------------- |
| AutoCloseResolvedReportJob           | hourly          | BR-REP-024                          |
| SlaBreachVerificationJob             | every 15'       | BR-OFF-002                          |
| SlaBreachResolutionJob               | every 30'       | BR-OFF-003                          |
| SlaBreachInspectionJob               | every 30'       | BR-INS-030                          |
| OverdueReportNotificationJob         | hourly          | BR-REP-038                          |
| DraftCleanupJob                      | daily           | BR-REP-009                          |
| LeaderboardSnapshotJob               | daily           | BR-GAM-007                          |
| DataRetentionJob                     | weekly          | BR-ADM-010, BR-DAT-003              |
| AccountHardDeleteJob                 | daily           | BR-AUTH-023, BR-DAT-004             |
| PenaltyPaymentOverdueJob             | daily           | BR-INS-021                          |
| CompanyContractExpiryJob             | daily           | BR-CMP-007                          |
| CompareDuplicateImagesJob            | event-driven    | BR-REP-031, BR-AI-002               |
| DispatchNotificationChannelsJob      | every 5'        | BR-NTF-001                          |
| PriorityScoreRefreshJob              | every 30'       | BR-OFF-004                          |
| CleanupProgressSlaJob                | every 6h        | BR-CLN-005                          |
| CommunityCleanupCheckInReminderJob   | event-driven    | BR-CMU-013                          |
| SendAuthEmailJob                     | event-driven    | BR-AUTH-007, BR-AUTH-019             |
