import Card from "../ui/Card";

interface AdminHeaderProps {
  title?: string;
  description?: string;
}

export default function AdminHeader({
  title = "HRPR Admin Dashboard",
  description = "Manage your conference agenda, speakers, and monitor user interactions",
}: AdminHeaderProps) {
  return (
    <Card className="p-6 mb-8">
      <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
      <p className="text-white/70">{description}</p>
    </Card>
  );
}
