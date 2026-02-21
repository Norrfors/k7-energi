// En enkel "kort"-komponent som visar ett värde med en titel.
// Används på dashboarden för att visa t.ex. temperaturer.

interface StatusCardProps {
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
}

export function StatusCard({ title, value, subtitle, color = "blue" }: StatusCardProps) {
  const colorClasses: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50",
    orange: "border-orange-200 bg-orange-50",
    red: "border-red-200 bg-red-50",
    gray: "border-gray-200 bg-gray-50",
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${colorClasses[color] || colorClasses.blue}`}>
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
