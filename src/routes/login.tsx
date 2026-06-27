import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@/assets/kerala-police-logo.png";
import { Shield, Lock, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: sbError } = await supabase
        .from("officers")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .single();

      if (data) {
        localStorage.setItem("auth", "true");
        router.navigate({ to: "/cases" });
      } else {
        setError("Invalid username or password");
      }
    } catch (err) {
      setError("Unable to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img
            src={logo}
            alt="Kerala Police Logo"
            className="h-20 w-20 bg-white rounded-full p-1 shadow-sm"
          />
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold text-[#0a1f44] tracking-tight">
          Cybercrime Police Station
        </h2>
        <p className="mt-2 text-center text-sm text-[#5a6478]">Palakkad District</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-[#e0e4ed] sm:rounded-xl sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-[#0a1f44]">Username</label>
              <div className="mt-2 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-[#8192b0]" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 sm:text-sm border-[#e0e4ed] rounded-md focus:ring-[#0a1f44] focus:border-[#0a1f44] py-2.5 bg-[#fcfdff]"
                  placeholder="Officer ID"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0a1f44]">Password</label>
              <div className="mt-2 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#8192b0]" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 sm:text-sm border-[#e0e4ed] rounded-md focus:ring-[#0a1f44] focus:border-[#0a1f44] py-2.5 bg-[#fcfdff]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm font-medium text-center bg-red-50 py-2 rounded-md border border-red-100">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0a1f44] hover:bg-[#0a1f44]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0a1f44] transition-colors gap-2 items-center"
              >
                <Shield size={16} />
                Secure Login
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-[#e0e4ed]">
            <p className="text-xs text-center text-[#8192b0]">
              Unauthorized access is strictly prohibited.
              <br />
              All login attempts are monitored and recorded.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
