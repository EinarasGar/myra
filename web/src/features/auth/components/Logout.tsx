import { Button } from "@mui/material";
import storage from "../utils";

function Logout() {
  return (
    <Button
      variant="contained"
      onClick={() => {
        storage.clearToken();
      }}
    >
      Logout
    </Button>
  );
}

export default Logout;
