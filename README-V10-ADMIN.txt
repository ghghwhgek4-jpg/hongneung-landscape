홍능조경 V10 - 갤러리 관리자 시스템 준비

이번 버전은 V9 디자인을 유지하면서 갤러리를 관리자에서 관리할 수 있도록 구조를 추가했습니다.

추가:
- /admin.html 관리자 화면
- 사진 여러 장 업로드
- 카테고리 지정
- 공개/비공개
- 사진 삭제
- 갤러리 자동 조회 API
- R2 이미지 저장 API
- D1 갤러리 메타데이터 저장
- 이미지 URL을 /api/image/... 로 제공
- 기존 정적 갤러리는 API가 아직 설정되지 않아도 그대로 표시됨

Cloudflare에서 실제 관리자 기능을 사용하려면:
1. D1 데이터베이스 생성: hongneung-gallery
2. schema.sql 실행
3. R2 버킷 생성: hongneung-gallery-media
4. Pages 프로젝트 Settings > Functions/Bindings에서
   D1 binding 이름을 DB, R2 binding 이름을 MEDIA로 연결
5. Settings > Variables and Secrets에서 ADMIN_TOKEN을 Secret으로 등록
6. 이 ZIP의 functions 폴더를 배포에 포함
7. /admin.html 접속 후 ADMIN_TOKEN으로 로그인

보안:
- ADMIN_TOKEN을 HTML/JS에 직접 넣지 않습니다.
- 관리자 페이지는 noindex/nofollow입니다.
- API는 Bearer 토큰을 요구합니다.
- R2 버킷은 직접 공개하지 않고 /api/image 경로로 제공합니다.

주의:
현재 Cloudflare 계정의 D1/R2를 이 작업환경에서 직접 생성하거나 연결할 수 없으므로,
5번까지의 Cloudflare 설정이 끝나야 업로드/삭제가 실제 영구 저장됩니다.
