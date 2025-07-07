import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { login } from "@/redux/authSlice";

export default function AuthForm() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!phone || !password) {
      setError("Please enter phone and password.");
      return;
    }

    try {
      const response = await fetch("http://localhost:4000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, password }),
      });

      if (!response.ok) throw new Error(await response.text());

      const userData = await response.json();
      const { phone: serverPhone, role, branch } = userData.user;

      dispatch(
        login({
          phone: serverPhone,
          role,
          branch: branch ? { id: branch._id, name: branch.name } : null,
        })
      );

      navigate("/layout/dashboard");
    } catch (err) {
      setError(err.message || "Login failed.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-10">
        <h1 className="text-3xl font-bold text-center text-black mb-2">
          Sivaji Power Tools
        </h1>
        <p className="text-center text-gray-600 mb-8">Login Portal</p>

        {error && (
          <div className="mb-4 text-red-600 text-center font-semibold">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <Label className="py-2">Phone</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-500" size={20} />
              <Input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10 bg-white text-black"
                required
              />
            </div>
          </div>

          <div>
            <Label className="py-2">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-500" size={20} />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-white text-black"
                required
              />
              <div
                className="absolute right-3 top-3 text-gray-500 cursor-pointer"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full bg-black text-white">
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
