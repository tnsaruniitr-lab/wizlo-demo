export function formatTimeStuck(createdAt: string | Date): string {
  const start = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${diffHours}h ${diffMinutes}m ago`;
}

export function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getProgramColor(programType: string): string {
  const colors: Record<string, string> = {
    "GLP-1": "bg-blue-500/10 text-blue-500 border-blue-500/20",
    "HRT": "bg-purple-500/10 text-purple-500 border-purple-500/20",
    "TRT": "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    "Peptides": "bg-teal-500/10 text-teal-500 border-teal-500/20",
    "Hair Loss": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    "Sexual Health": "bg-rose-500/10 text-rose-500 border-rose-500/20",
  };
  return colors[programType] || "bg-gray-500/10 text-gray-500 border-gray-500/20";
}

export function getSeverityColor(severity: string): string {
  const s = severity.toLowerCase();
  if (s === "high") return "bg-red-500/10 text-red-500 border-red-500/20";
  if (s === "medium") return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  if (s === "low") return "bg-green-500/10 text-green-500 border-green-500/20";
  return "bg-gray-500/10 text-gray-500 border-gray-500/20";
}
