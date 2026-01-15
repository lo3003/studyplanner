"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(""); // Nouveau champ !
  const [isSignUp, setIsSignUp] = useState(false); // Pour basculer entre Login et Inscription
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async () => {
    setLoading(true);

    if (isSignUp) {
      // --- MODE INSCRIPTION ---
      if (!fullName) {
        toast.error("Le prénom est obligatoire pour s'inscrire !");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName, // On envoie le prénom à Supabase ici
          },
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Compte créé ! Vérifie tes mails.");
        setIsSignUp(false); // On repasse en mode connexion
      }
    } else {
      // --- MODE CONNEXION ---
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Heureux de vous revoir !");
        router.push("/");
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Card className="w-[350px] shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center font-bold text-blue-600">
            Study Planner
          </CardTitle>
          <p className="text-center text-gray-500 text-sm">
            {isSignUp ? "Créer un compte étudiant" : "Connexion"}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="space-y-2">
            {/* Ce champ n'apparait que si on s'inscrit */}
            {isSignUp && (
              <Input
                type="text"
                placeholder="Ton Prénom"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            )}
            
            <Input
              type="email"
              placeholder="Email étudiant"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col gap-2 mt-2">
            <Button onClick={handleAuth} disabled={loading} className="w-full">
              {loading ? "Chargement..." : (isSignUp ? "S'inscrire" : "Se connecter")}
            </Button>
            
            <div className="text-center text-sm text-gray-500 mt-2">
                {isSignUp ? "Déjà un compte ?" : "Pas encore de compte ?"}
                <button 
                    onClick={() => setIsSignUp(!isSignUp)} 
                    className="ml-2 text-blue-600 font-bold hover:underline"
                >
                    {isSignUp ? "Se connecter" : "Créer un compte"}
                </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}