import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {createBrowserRouter,  Navigate} from "react-router";
import {RouterProvider} from "react-router/dom";
import { AuthProvider } from "./AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import Dashboard from './pages/Dashboard.tsx';
import Login from './pages/Login.tsx';
import LinkStats from './pages/LinkStats.tsx';
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
       { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "login", element: <Login /> },
      {
        element: <ProtectedRoute />, // everything below requires login
        children: [
          { path: "dashboard", element: <Dashboard /> },
          { path: "links/:id", element: <LinkStats /> },
        ],
      },
    ],
  },
]);


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);