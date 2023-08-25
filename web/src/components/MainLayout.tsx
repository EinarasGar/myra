import { AppBar, Button, Toolbar } from "@mui/material";
import { Link, Outlet } from "react-router-dom";

function MainLayout() {
  return (
    <div>
      <AppBar position="static">
        <Toolbar>
          myra
          <Link to="/transactions">
            <Button>Transaction</Button>
          </Link>
          <Link to="/portfolio">
            <Button>Portfolio</Button>
          </Link>
          <Link to="/transactions/add">
            <Button>Transaction Add</Button>
          </Link>
          <Link to="/auth/login">
            <Button>Login</Button>
          </Link>
          <Link to="/auth/logout">
            <Button>Logout</Button>
          </Link>
        </Toolbar>
      </AppBar>
      <Outlet />
    </div>
  );
}

export default MainLayout;
