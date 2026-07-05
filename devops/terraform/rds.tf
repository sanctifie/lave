# ─────────────────────────────────────────────────────────────────────────────
# BASE DE DONNÉES (RDS PostgreSQL)
#
# POURQUOI RDS (vs PostgreSQL auto-géré sur EC2/K8s) ?
# Sauvegardes automatiques, patchs, failover multi-AZ, chiffrement, monitoring :
# tout ça est NOTRE responsabilité si on l'auto-héberge. Pour des données de
# SANTÉ, le risque opérationnel ne vaut pas l'économie (~15 €/mois).
# Règle générale : l'état (DB) chez le cloud provider, le stateless chez nous.
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_db_subnet_group" "main" {
  name       = "mbolo-${var.environment}"
  subnet_ids = module.vpc.database_subnets
}

resource "aws_security_group" "rds" {
  name_prefix = "mbolo-rds-${var.environment}-"
  vpc_id      = module.vpc.vpc_id

  # SEULS les nœuds EKS peuvent parler à PostgreSQL. Pas d'IP publiques,
  # pas de 0.0.0.0/0 : le moindre privilège s'applique aussi au réseau.
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }
}

resource "aws_db_instance" "main" {
  identifier     = "mbolo-${var.environment}"
  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  db_name  = var.db_name
  username = var.db_username
  # Mot de passe GÉNÉRÉ et stocké dans AWS Secrets Manager — jamais en clair
  # dans le code, le state ou la CI.
  manage_master_user_password = true

  allocated_storage     = 20
  max_allocated_storage = 100          # autoscaling du disque
  storage_encrypted     = true         # obligatoire : données de santé

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  multi_az                = var.environment == "production"  # failover auto en prod
  backup_retention_period = var.environment == "production" ? 14 : 3
  deletion_protection     = var.environment == "production"
  skip_final_snapshot     = var.environment != "production"
}
