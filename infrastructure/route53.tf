# Route 53 DNS Configuration
# This file handles custom domain configuration for different environments

# Route 53 Hosted Zone (only if custom domain is enabled)
resource "aws_route53_zone" "main" {
  count = var.enable_custom_domain && var.domain_name != "" ? 1 : 0
  
  name = var.domain_name

  tags = {
    Name        = "${var.project_name}-hosted-zone"
    Environment = var.environment
  }
}

# ACM Certificate for SSL (only if custom domain is enabled)
resource "aws_acm_certificate" "main" {
  count = var.enable_custom_domain && var.domain_name != "" ? 1 : 0
  
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.project_name}-ssl-cert"
    Environment = var.environment
  }
}

# ACM Certificate Validation (only if custom domain is enabled)
resource "aws_route53_record" "cert_validation" {
  count = var.enable_custom_domain && var.domain_name != "" ? 1 : 0
  
  for_each = {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main[0].zone_id
}

# Wait for certificate validation
resource "aws_acm_certificate_validation" "main" {
  count = var.enable_custom_domain && var.domain_name != "" ? 1 : 0
  
  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation[0] : record.fqdn]

  timeouts {
    create = "5m"
  }
}

# DNS Records for different environments
locals {
  subdomain = var.environment == "production" ? "app" : var.environment
}

resource "aws_route53_record" "app" {
  count = var.enable_custom_domain && var.domain_name != "" ? 1 : 0
  
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "${local.subdomain}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# Outputs for custom domain URLs
output "app_url" {
  description = "Public URL for the application"
  value = var.enable_custom_domain && var.domain_name != "" ? (
    "https://${local.subdomain}.${var.domain_name}"
  ) : (
    "http://${aws_lb.main.dns_name}"
  )
}

output "domain_nameservers" {
  description = "Name servers for the hosted zone (set these in your domain registrar)"
  value = var.enable_custom_domain && var.domain_name != "" ? (
    aws_route53_zone.main[0].name_servers
  ) : []
}