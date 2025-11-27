import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../redux/authSlice";
import { useNavigate } from "react-router-dom";

const AuthInitializer = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { expiresAt, isLoggedIn } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isLoggedIn && expiresAt) {
      const now = Date.now();
      if (now > expiresAt) {
        console.warn("⛔ Session expired (midnight passed). Logging out...");
        dispatch(logout());
        navigate("/");
      }
    }
  }, [dispatch, navigate, isLoggedIn, expiresAt]);

  return null; // This component doesn't render anything
};

export default AuthInitializer;
