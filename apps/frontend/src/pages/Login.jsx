import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { login } from "@/redux/authSlice";
import { toast } from "sonner";

export default function AuthForm() {
  const [isSignup, setIsSignup] = useState(false); // 👈 Toggle mode
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [branch, setBranch] = useState("");
  const [name, setName] = useState(""); // 👈 Needed for signup
  const [error, setError] = useState("");
  const [branches, setBranches] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  //const branches = ["Chennai", "Madurai", "Ramnad", "Coimbatore"];
  const fetchBranches = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/branch/all");
      if (!res.ok) throw new Error("Failed to fetch branches");
      const data = await res.json();
      setBranches(data); // assuming data is an array of branches
    } catch (err) {
      console.error("Error fetching branches:", err.message);
    }
  };

  useEffect(() => {
    if (isSignup) {
      fetchBranches();
    }
  }, [isSignup]); // 👈 include isSignup here

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !email ||
      !password ||
      (isSignup && (!name || !role || (role === "staff" && !branch)))
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    const url = isSignup
      ? "http://localhost:4000/api/signup"
      : "http://localhost:4000/api/login";

    const body = isSignup
      ? { name, email, password, role, branchId: branch }
      : { email, password };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error(await response.text());

      const userData = await response.json();
      //const { email, role, branch.name } = userData.user;
      if (!isSignup) {
        const { email, role, branch } = userData.user;
        dispatch(
          login({
            email,
            role,
            branch: branch ? { id: branch._id, name: branch.name } : null,
          })
        );
        navigate("/layout/dashboard");
      } else {
        setName("");
        setEmail("");
        setPassword("");
        setRole("");
        setBranch("");
         toast.success("Signed up successfully!");
        setIsSignup(false); // Switch to login after successful signup
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="max-w-md w-full bg-gray-100 rounded-xl shadow-lg p-10">
        <h1 className="text-3xl font-bold text-black mb-4 text-center">
          {isSignup ? "Create Account" : "Welcome Back"}
        </h1>
        <p className="text-center text-gray-600 mb-8">
          {isSignup
            ? "Sign up for a Tools Rental account"
            : "Sign in to your Tools Rental account"}
        </p>

        {error && (
          <div className="mb-4 text-red-600 text-center font-semibold">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleAuth}>
          {isSignup && (
            <div>
              <Label className="py-2">Name</Label>
              <div className="relative">
                <User
                  className="absolute left-3 top-3 text-gray-500"
                  size={20}
                />
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-white text-black placeholder-gray-400"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <Label className="py-2">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-500" size={20} />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </div>
            </div>
          </div>
          {isSignup && (
            <div>
              <Label className="py-2">Role</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black"
              >
                <option>Select Role</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          )}
          {isSignup && role == "staff" && (
            <div>
              <Label>Branch</Label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black"
              >
                <option value="">Select a branch</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button type="submit" className="w-full bg-black text-white">
            {isSignup ? "Sign Up" : "Sign In"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            className="text-blue-600 hover:underline font-medium"
            onClick={() => setIsSignup(!isSignup)}
          >
            {isSignup ? "Login" : "Signup"}
          </button>
        </p>
      </div>
    </div>
  );
}
