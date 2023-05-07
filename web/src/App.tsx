import { useState } from "react";
import { Button } from "@mui/material";

function App() {
  const [count, setCount] = useState(0);
  return (
    <div className="flex justify-center">
      <Button variant="contained" onClick={() => setCount((c) => c + 1)}>
        count is {count}
      </Button>
      <p className="as" />
    </div>
  );
}

export default App;
