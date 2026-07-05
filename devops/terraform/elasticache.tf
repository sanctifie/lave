# ─────────────────────────────────────────────────────────────────────────────
# REDIS (ElastiCache) — OTP + rate-limiting de l'API.
# Même logique que RDS : service d'état → managé. cache.t4g.micro ≈ 11 €/mois.
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_elasticache_subnet_group" "main" {
  name       = "mbolo-${var.environment}"
  subnet_ids = module.vpc.database_subnets
}

resource "aws_security_group" "redis" {
  name_prefix = "mbolo-redis-${var.environment}-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "mbolo-${var.environment}"
  description          = "Redis MBOLO (OTP, rate-limit)"

  engine         = "redis"
  engine_version = "7.1"
  node_type      = "cache.t4g.micro"

  # 1 nœud en staging ; 2 (primaire + réplica avec failover auto) en prod
  num_cache_clusters         = var.environment == "production" ? 2 : 1
  automatic_failover_enabled = var.environment == "production"

  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}
