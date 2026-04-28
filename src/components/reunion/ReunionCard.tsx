import Link from "next/link";
import type { Reunion } from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusLabels: Record<string, string> = {
  planning: "Planning",
  date_locked: "Date Locked",
  finalized: "Finalized",
  cancelled: "Cancelled",
};

const statusVariants: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  planning: "secondary",
  date_locked: "default",
  finalized: "outline",
  cancelled: "destructive",
};

export function ReunionCard({
  reunion,
  isOrganizer,
}: {
  reunion: Reunion;
  isOrganizer?: boolean;
}) {
  return (
    <Link href={`/reunion/${reunion.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{reunion.name}</CardTitle>
            <Badge variant={statusVariants[reunion.status]}>
              {statusLabels[reunion.status]}
            </Badge>
          </div>
          {reunion.description && (
            <CardDescription className="line-clamp-2">
              {reunion.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {isOrganizer ? "Organizer" : "Member"} · Created{" "}
            {new Date(reunion.createdAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
