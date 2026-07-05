# ─────────────────────────────────────────────────────────────────────────────
# KUBERNETES MANAGÉ (EKS)
#
# POURQUOI EKS (vs ECS, vs EC2+docker, vs Lambda) ?
# - EC2 + docker compose : simple mais pas d'auto-réparation ni d'autoscaling
#   propre — acceptable pour un pilote, pas pour la prod santé.
# - ECS/Fargate : très bien et moins cher à opérer… mais verrouillé AWS et
#   surtout : l'objectif ici est d'apprendre l'écosystème STANDARD (K8s,
#   ArgoCD, Prometheus) transposable partout (GCP, OVH, on-prem).
# - Lambda : inadapté à une API long-running + WebSocket/polling + Prisma.
# → EKS = le compromis "standard de l'industrie", au prix d'un coût fixe
#   (~70 €/mois le control plane) qu'on assume pour la valeur pédagogique.
# ─────────────────────────────────────────────────────────────────────────────

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.8"

  cluster_name    = "mbolo-${var.environment}"
  cluster_version = var.eks_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets   # nœuds en privé, jamais exposés

  # Accès à l'API server K8s : public restreint est OK pour débuter ;
  # en entreprise on passe par un bastion/VPN et endpoint privé.
  cluster_endpoint_public_access = true

  # Addons gérés : AWS les met à jour à notre place
  cluster_addons = {
    coredns    = {}
    kube-proxy = {}
    vpc-cni    = {}
  }

  eks_managed_node_groups = {
    general = {
      # t3.medium : 2 vCPU / 4 Go — le minimum confortable pour K8s + une API.
      # SPOT en staging (jusqu'à -70 %), ON_DEMAND en prod (pas d'éviction).
      instance_types = ["t3.medium"]
      capacity_type  = var.environment == "production" ? "ON_DEMAND" : "SPOT"

      min_size     = var.api_min_nodes
      max_size     = var.api_max_nodes
      desired_size = var.api_min_nodes
    }
  }

  # Donne les droits d'admin cluster à l'identité qui exécute Terraform
  enable_cluster_creator_admin_permissions = true
}
