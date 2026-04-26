import React from "react";
import { Composition } from "remotion";
import { PitstopMobileDemo } from "./PitstopMobileDemo.jsx";
import storyboard from "./generated/storyboard.json";

export const Root = () => {
  return (
    <Composition
      id="PitstopMobileDemo"
      component={PitstopMobileDemo}
      durationInFrames={3600}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ storyboard }}
    />
  );
};
