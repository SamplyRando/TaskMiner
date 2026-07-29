import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type PagePlaceholderProps = {
  description: string;
  title: string;
};

export function PagePlaceholder({ description, title }: PagePlaceholderProps) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Badge variant="outline">Fondation frontend</Badge>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground max-w-2xl">{description}</p>
      </div>
      <Card>
        <CardContent className="text-muted-foreground flex min-h-48 items-center justify-center pt-6 text-center text-sm">
          Cette page est prête à accueillir les fonctionnalités d’un prochain
          sprint.
        </CardContent>
      </Card>
    </section>
  );
}
