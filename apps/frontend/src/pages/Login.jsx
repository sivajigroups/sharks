import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { login, logout } from "@/redux/authSlice";
import api from "@/api/axios"; // ✅ your axios instance with interceptor

// ✅ GLOBAL TIMER (module scope)
let logoutTimer = null;

export default function AuthForm() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { logintoken } = useSelector((state) => state.auth);

  // ✅ If already logged in, redirect to dashboard
  useEffect(() => {
    if (logintoken !== null) {
      navigate("/layout/dashboard");
    }
  }, [logintoken, navigate]);

  // ✅ Clear timer if component ever unmounts (safety)
  useEffect(() => {
    return () => {
      if (logoutTimer) clearTimeout(logoutTimer);
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!phone || !password) {
      setError("Please enter phone and password.");
      return;
    }

    try {
      // ✅ use axios instance instead of fetch
      const { data: userData } = await api.post("/login", {
        phone,
        password,
      });

      const { phone: serverPhone, role, branch } = userData.user;

      // 1) Save to Redux
      dispatch(
        login({
          phone: serverPhone,
          role,
          branch: branch ? { id: branch._id, name: branch.name } : null,
          token: userData.token,
          expiresIn: userData.expiresIn,
        })
      );

      // 2) Clear previous logout timer
      if (logoutTimer) clearTimeout(logoutTimer);

      // 3) Auto-logout when token expires
      const expirySeconds = userData.expiresIn || 100;

      logoutTimer = setTimeout(() => {
        console.log("⏳ Auto Logout → Token Expired");
        dispatch(logout());
        navigate("/login");
      }, expirySeconds * 1000);

      // 4) Go to dashboard
      navigate("/layout/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.response?.data || err.message || "Login failed.");
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
            <Label className="py-2">Phone No</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-500" size={20} />
              <Input
                type="number"
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
