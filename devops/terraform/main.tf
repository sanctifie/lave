# ─────────────────────────────────────────────────────────────────────────────
# MBOLO Santé — Infrastructure AWS as Code (Terraform)
#
# POURQUOI TERRAFORM (vs console, CloudFormation, Pulumi) ?
# - Console : non reproductible, non revue, non versionnée → interdite en prod.
# - CloudFormation : verrouillé AWS, verbeux ; Terraform est multi-cloud et a
#   l'écosystème de modules le plus riche.
# - Pulumi : très bien si l'équipe veut du "vrai code" (TS/Python), mais HCL
#   déclaratif est plus simple à auditer et le standard du marché.
#
# Commandes : terraform init → plan → apply (voir devops/README.md)
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
  }

  # LE STATE EST SACRÉ : il décrit ce que Terraform croit exister.
  # On le stocke dans S3 (partagé, versionné) avec verrou DynamoDB pour
  # empêcher deux `apply` simultanés de se marcher dessus.
  # → Créer d'abord le bucket + la table (bootstrap/, une seule fois).
  backend "s3" {
    bucket         = "mbolo-terraform-state"     # à créer au bootstrap
    key            = "infra/terraform.tfstate"
    region         = "eu-west-3"                 # Paris : latence correcte vers Libreville
    dynamodb_table = "mbolo-terraform-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "mbolo-sante"
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}
