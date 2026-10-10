import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

export function PasswordStrengthBar({ password }: { password: string }) {
  const [strength, setStrength] = useState(0);

  useEffect(() => {
    let score = 0;
    if (!password) {
      setStrength(0);
      return;
    }
    
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 25;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 10;
    if (/[^A-Za-z0-9]/.test(password)) score += 10;
    
    setStrength(Math.min(100, score));
  }, [password]);

  const getColor = () => {
    if (strength === 0) return "bg-muted";
    if (strength < 30) return "[&>div]:bg-red-500";
    if (strength < 60) return "[&>div]:bg-orange-500";
    if (strength < 80) return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-green-500";
  };

  const getLabel = () => {
    if (!password) return "";
    if (strength < 30) return "Weak";
    if (strength < 60) return "Fair";
    if (strength < 80) return "Good";
    return "Strong";
  };

  if (!password) return null;

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">Password strength</span>
        <span className={strength >= 80 ? "text-green-500 font-medium" : "text-muted-foreground"}>{getLabel()}</span>
      </div>
      <Progress value={strength} className={`h-1.5 w-full ${getColor()}`} />
      <ul className="text-[10px] text-muted-foreground space-y-0.5 pt-1">
        <li className={password.length >= 8 ? "text-green-500" : ""}>
          {password.length >= 8 ? "✓" : "○"} At least 8 characters
        </li>
      </ul>
    </div>
  );
}
