import React, { useState } from 'react';
import { ArrowLeft, Terminal, FileCode2, Copy, Check } from 'lucide-react';

interface TakeHomeGhostwriterProps {
  isDarkMode: boolean;
  onBack: () => void;
}

export const TakeHomeGhostwriter: React.FC<TakeHomeGhostwriterProps> = ({ isDarkMode, onBack }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      setResult(`\`\`\`terraform
# main.tf
provider "aws" {
  region = "us-east-1"
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "takehome-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
}

resource "aws_eks_cluster" "main" {
  name     = "takehome-cluster"
  role_arn = aws_iam_role.eks_cluster.arn
  vpc_config {
    subnet_ids = module.vpc.private_subnets
  }
}
\`\`\`

\`\`\`markdown
# Architecture Decisions
1. **High Availability**: Multi-AZ VPC deployment ensures fault tolerance.
2. **Security**: EKS nodes placed in private subnets with NAT Gateway for outbound traffic.
3. **Scalability**: Terraform modules used for reusable and standardized IaC.
\`\`\`
`);
      setIsGenerating(false);
    }, 2500);
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={onBack}
          className={`p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-500" />
            Take-Home Ghostwriter
          </h2>
          <p className="text-xs opacity-70">Automated IaC & Architecture Boilerplates</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full space-y-6 overflow-y-auto custom-scrollbar pb-8">
        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/10'}`}>
          <h3 className="text-sm font-bold mb-4 uppercase tracking-wider opacity-70 flex items-center gap-2">
            <FileCode2 className="w-4 h-4" /> Assessment Prompt
          </h3>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Paste the take-home assignment prompt here (e.g. 'Deploy an EKS cluster with a custom VPC in Terraform...')"
            className={`w-full h-40 p-4 rounded-xl border text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none custom-scrollbar ${isDarkMode ? 'bg-[#1a1a1a] border-white/10 text-gray-300' : 'bg-gray-50 border-black/10 text-gray-800'}`}
          />
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full mt-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Terminal className="w-5 h-5" />}
            {isGenerating ? 'Generating Infrastructure...' : 'Generate Boilerplate'}
          </button>
        </div>

        {result && (
          <div className={`p-6 rounded-2xl border relative ${isDarkMode ? 'bg-[#1a1a1a] border-amber-500/30' : 'bg-gray-900 border-amber-500/20 text-gray-100'}`}>
            <button 
              onClick={handleCopy}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold text-white"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy All'}
            </button>
            <div className="font-mono text-xs md:text-sm whitespace-pre-wrap overflow-x-auto custom-scrollbar pt-8 text-gray-300">
              {result}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
