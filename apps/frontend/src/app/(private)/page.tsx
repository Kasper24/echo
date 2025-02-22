import { Metadata } from "next";
import { log } from "@repo/logger";
import { Button } from "@repo/ui/components/button";

export const metadata: Metadata = {
  title: "Echo",
  description: "Realtime chat app",
};

export default function Store() {
  log("Hey! This is the Store page.");

  return (
    <div className="">
      <Button variant="link">test</Button>
    </div>
  );
}
