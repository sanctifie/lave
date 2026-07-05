# ─────────────────────────────────────────────────────────────────────────────
# RÉSEAU (VPC)
# Architecture classique 3 couches sur 2 zones de disponibilité (AZ) :
#   - subnets PUBLICS  : load balancer, NAT gateway (exposés à Internet)
#   - subnets PRIVÉS   : nœuds EKS (sortie Internet via NAT, jamais entrants)
#   - subnets DATA     : RDS + Redis (AUCUN accès Internet, même sortant)
# Pourquoi le module officiel plutôt que des resources à la main ? ~40 blocs
# (routes, NAT, IGW…) éprouvés en 25 lignes, sans réinventer les pièges.
# ─────────────────────────────────────────────────────────────────────────────

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.8"

  name = "mbolo-${var.environment}"
  cidr = var.vpc_cidr

  azs              = ["${var.aws_region}a", "${var.aws_region}b"]
  public_subnets   = ["10.0.0.0/24", "10.0.1.0/24"]
  private_subnets  = ["10.0.10.0/24", "10.0.11.0/24"]
  database_subnets = ["10.0.20.0/24", "10.0.21.0/24"]

  # 1 seule NAT gateway en staging (≈ 32 €/mois chacune) ; 1 par AZ en prod
  # pour survivre à la panne d'une zone.
  enable_nat_gateway     = true
  single_nat_gateway     = var.environment == "staging"
  one_nat_gateway_per_az = var.environment == "production"

  enable_dns_hostnames = true

  # Tags requis par EKS/ALB pour découvrir automatiquement les subnets
  public_subnet_tags  = { "kubernetes.io/role/elb" = "1" }
  private_subnet_tags = { "kubernetes.io/role/internal-elb" = "1" }
}
