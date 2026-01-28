# Inject Secrets Script

Script để tự động inject environment variables từ GitHub Secrets/Variables vào ECS task definition trước khi deploy.

## Mục đích

Thay vì hard-code secrets trong file `infrastructure/ecs-task-definition.json`, script này:
1. Đọc task definition template từ infrastructure folder
2. Inject tất cả secrets từ GitHub environment variables
3. Ghi ra file mới với secrets đã được inject
4. File mới này được dùng để deploy lên ECS

## Cách sử dụng

### Trong GitHub Actions Workflow

```yaml
- name: Inject secrets into task definition
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    AUTH_SECRET: ${{ secrets.AUTH_SECRET }}
    # ... other secrets
  run: |
    node scripts/inject-secrets-to-task-definition.js \
      --input infrastructure/ecs-task-definition.json \
      --output web-task-definition.json \
      --container goodseed-app
```

### Local testing (không khuyến nghị)

```bash
export AUTH_SECRET="your-secret"
export DATABASE_URL="your-db-url"
# ... export other secrets

node scripts/inject-secrets-to-task-definition.js \
  --input infrastructure/ecs-task-definition.json \
  --output test-task-definition.json \
  --container goodseed-app
```

## Parameters

- `--input`: Đường dẫn tới file task definition template
- `--output`: Đường dẫn file output (task definition với secrets đã inject)
- `--container`: Tên container cần inject secrets (ví dụ: `goodseed-app`, `goodseed-worker`)

## Environment Variables được inject

### Core Application
- `NODE_ENV`
- `DATABASE_URL`

### Authentication & Security
- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`

### Email Service (Resend)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

### OAuth Providers
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_FACEBOOK_ID`
- `AUTH_FACEBOOK_SECRET`

### Redis
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD` (optional)

### Cron & Worker
- `CRON_SECRET`

### Cloudflare
- `CLOUDFLARE_ZONE_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_DOMAIN`

### Public Variables
- `NEXT_PUBLIC_DEMO_PASSWORD`

## Output

Script sẽ in ra:
- ✅ Số biến đã inject (biến mới)
- 🔄 Số biến đã update (ghi đè giá trị cũ)
- ⏭️ Số biến skip (giá trị giống nhau)
- ⚠️ Danh sách biến missing (chưa set trong environment)

## Lưu ý bảo mật

- ⚠️ **KHÔNG BAO GIỜ** commit file output (`*-task-definition.json`) vào git
- ✅ File template trong `infrastructure/` có thể chứa placeholder hoặc giá trị mặc định
- ✅ Secrets thực chỉ tồn tại trong GitHub Secrets và runtime environment
- ✅ File output chỉ được tạo trong CI/CD pipeline, không lưu trữ lâu dài

## Troubleshooting

### Missing environment variables
Nếu thấy warning về missing variables, kiểm tra:
1. GitHub repository Settings → Secrets and variables
2. Đảm bảo tất cả secrets cần thiết đã được set
3. Với GitHub Variables (public), dùng `vars.VARIABLE_NAME` thay vì `secrets.VARIABLE_NAME`

### Container not found
```
❌ Container "xyz" not found in task definition
```
→ Kiểm tra tên container trong task definition phải khớp với `--container` parameter

### Script fails in workflow
Kiểm tra:
1. Node.js đã được cài đặt trong workflow (thường có trong `ubuntu-latest`)
2. Script có quyền execute (`chmod +x`)
3. Đường dẫn file input/output đúng (relative to workspace root)
