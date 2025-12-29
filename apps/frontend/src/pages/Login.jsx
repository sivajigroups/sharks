import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { login, logout, setActiveBranch } from "@/redux/authSlice";
import api from "@/api/axios"; // ✅ your axios instance with interceptor
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ✅ GLOBAL TIMER (module scope)
let logoutTimer = null;

export default function AuthForm() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { logintoken } = useSelector((state) => state.auth);

  // ✅ If already logged in, redirect to dashboard
  useEffect(() => {
    if (logintoken !== null) {
      navigate("/layout/ad");
    }
  }, [logintoken, navigate]);

  // ✅ Clear timer if component ever unmounts (safety)
  useEffect(() => {
    return () => {
      if (logoutTimer) clearTimeout(logoutTimer);
    };
  }, []);

  const finalizeLogin = (payload) => {
    // 1) Save to Redux
    dispatch(login(payload));

    // 2) Clear previous logout timer
    if (logoutTimer) clearTimeout(logoutTimer);

    // 3) Auto-logout when token expires
    const expirySeconds = payload.expiresIn || 100;

    logoutTimer = setTimeout(() => {
      console.log("⏳ Auto Logout → Token Expired");
      dispatch(logout());
      navigate("/login");
    }, expirySeconds * 1000);

    // 4) Go to dashboard
    navigate("/layout/dashboard");
  };

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
      const branches = userData.user.branches || (branch ? [branch] : []);

      const basePayload = {
        phone: serverPhone,
        role,
        branches,
        token: userData.token,
        expiresIn: userData.expiresIn,
      };

      // 4) Check for multiple branches
      if (role === "staff" && branches.length > 1) {
        setPendingLoginData(basePayload);
        setShowBranchModal(true);
        return; // Stop navigation, wait for selection
      }

      // Single branch or not staff
      finalizeLogin({
        ...basePayload,
        branch: branches.length === 1 ? branches[0] : null,
      });
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

      {/* Branch Selection Dialog */}
      <Dialog open={showBranchModal} onOpenChange={setShowBranchModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Branch</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {(pendingLoginData?.branches || []).map((b) => (
              <Button
                key={b._id || b.id}
                variant="outline"
                className="justify-start text-left h-auto py-3 px-4"
                onClick={() => {
                  finalizeLogin({
                    ...pendingLoginData,
                    branch: b,
                  });
                }}
              >
                <div className="flex flex-col items-start bg-black text-white w-full rounded p-2">
                  <span className="font-semibold">{b.name}</span>
                  {b.location && (
                    <span className="text-xs text-gray-400">{b.location}</span>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
