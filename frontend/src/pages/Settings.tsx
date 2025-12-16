import { AppHeader } from "@/components/navigation/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Settings = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="relative container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Settings</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Settings page placeholder.
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;
