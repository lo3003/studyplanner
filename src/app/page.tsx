import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6 bg-slate-50">
      <h1 className="text-4xl font-bold text-blue-600">Smart Study Planner</h1>
      <p className="text-xl text-gray-600">Tout est installé correctement ! 🚀</p>
      <div className="flex gap-4">
        <Button>Bouton Test</Button>
        <Button variant="outline">Secondaire</Button>
      </div>
    </div>
  );
}