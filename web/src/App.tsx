import { useAuth } from "./hooks/use-auth";
import { router } from "./router";
import { RouterProvider } from "@tanstack/react-router";

function App() {
  const auth = useAuth();

  return (
    <>
      <RouterProvider router={router} context={{ auth }} />
    </>
  );
}

export default App;
