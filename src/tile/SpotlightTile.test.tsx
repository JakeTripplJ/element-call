/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE in the repository root for full details.
*/

import { test, expect, vi } from "vitest";
import { isInaccessible, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@vector-im/compound-web";

import { SpotlightTile } from "./SpotlightTile";
import {
  mockLocalParticipant,
  mockMediaDevices,
  mockRtcMembership,
  createLocalMedia,
  createRemoteMedia,
  mockRemoteParticipant,
  createScreenShareMedia,
} from "../utils/test";
import { SpotlightTileViewModel } from "../state/TileViewModel";
import { constant } from "../state/Behavior";

global.IntersectionObserver = class MockIntersectionObserver {
  public observe(): void {}
  public unobserve(): void {}
} as unknown as typeof IntersectionObserver;

global.ResizeObserver = class ResizeObserver {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
};

test("SpotlightTile is accessible", async () => {
  const vm1 = createRemoteMedia(
    mockRtcMembership("@alice:example.org", "AAAA"),
    {
      rawDisplayName: "Alice",
      getMxcAvatarUrl: () => "mxc://adfsg",
    },
    mockRemoteParticipant({}),
  );

  const vm2 = createLocalMedia(
    mockRtcMembership("@bob:example.org", "BBBB"),
    {
      rawDisplayName: "Bob",
      getMxcAvatarUrl: () => "mxc://dlskf",
    },
    mockLocalParticipant({}),
    mockMediaDevices({}),
  );

  const user = userEvent.setup();
  const toggleExpanded = vi.fn();
  const { container } = render(
    <SpotlightTile
      vm={new SpotlightTileViewModel(constant([vm1, vm2]), constant(false))}
      targetWidth={300}
      targetHeight={200}
      expanded={false}
      onToggleExpanded={toggleExpanded}
      showIndicators
      focusable={true}
    />,
  );

  expect(await axe(container)).toHaveNoViolations();
  // Alice should be in the spotlight, with her name and avatar on the
  // first page
  screen.getByText("Alice");
  const aliceAvatar = screen.getByRole("img");
  expect(screen.queryByRole("button", { name: "common.back" })).toBe(null);
  // Bob should be out of the spotlight, and therefore invisible
  expect(isInaccessible(screen.getByText("Bob"))).toBe(true);
  // Now navigate to Bob
  await user.click(screen.getByRole("button", { name: "Next" }));
  screen.getByText("Bob");
  expect(screen.getByRole("img")).not.toBe(aliceAvatar);
  expect(isInaccessible(screen.getByText("Alice"))).toBe(true);
  // Can toggle whether the tile is expanded
  await user.click(screen.getByRole("button", { name: "Expand" }));
  expect(toggleExpanded).toHaveBeenCalled();
});

test("Screen share volume UI is shown when screen share has audio", async () => {
  const vm = createScreenShareMedia(
    mockRtcMembership("@alice:example.org", "AAAA"),
    {},
    mockRemoteParticipant({}),
  );

  vi.spyOn(vm, "audioEnabled$", "get").mockReturnValue(constant(true));

  const toggleExpanded = vi.fn();
  const { container } = render(
    <TooltipProvider>
      <SpotlightTile
        vm={new SpotlightTileViewModel(constant([vm]), constant(false))}
        targetWidth={300}
        targetHeight={200}
        expanded={false}
        onToggleExpanded={toggleExpanded}
        showIndicators
        focusable
      />
    </TooltipProvider>,
  );

  expect(await axe(container)).toHaveNoViolations();

  // Volume slider/container should exist
  expect(screen.getByRole("slider")).toBeInTheDocument();
  expect(document.querySelector(".volumeContainer")).toBeInTheDocument();
});

test("Screen share volume UI is hidden when screen share has no audio", async () => {
  const vm = createScreenShareMedia(
    mockRtcMembership("@alice:example.org", "AAAA"),
    {},
    mockRemoteParticipant({}),
  );

  vi.spyOn(vm, "audioEnabled$", "get").mockReturnValue(constant(false));

  const toggleExpanded = vi.fn();
  const { container } = render(
    <SpotlightTile
      vm={new SpotlightTileViewModel(constant([vm]), constant(false))}
      targetWidth={300}
      targetHeight={200}
      expanded={false}
      onToggleExpanded={toggleExpanded}
      showIndicators
      focusable
    />,
  );

  expect(await axe(container)).toHaveNoViolations();

  // Volume slider/container should not exist
  expect(screen.queryByRole("slider")).toBeNull();
  expect(document.querySelector(".volumeContainer")).toBeNull();
});

test("Screen share volume UI is hidden in grid mode", async () => {
  const vm = createScreenShareMedia(
    mockRtcMembership("@alice:example.org", "AAAA"),
    {},
    mockRemoteParticipant({}),
  );

  vi.spyOn(vm, "audioEnabled$", "get").mockReturnValue(constant(true));

  const { container } = render(
    <TooltipProvider>
      <SpotlightTile
        vm={new SpotlightTileViewModel(constant([vm]), constant(false))}
        targetWidth={300}
        targetHeight={200}
        expanded={false}
        onToggleExpanded={null} // Grid mode
        showIndicators
        focusable
      />
    </TooltipProvider>,
  );

  expect(await axe(container)).toHaveNoViolations();

  // Volume slider and container should not exist in grid mode
  expect(screen.queryByRole("slider")).toBeNull();
  expect(document.querySelector(".volumeContainer")).toBeNull();
});
