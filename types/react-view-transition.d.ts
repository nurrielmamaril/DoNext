// `<ViewTransition>` ships in the React build Next.js swaps in when
// `experimental.viewTransition` is enabled, but @types/react doesn't declare
// it yet. This is the minimum surface the app actually uses.
import "react";

declare module "react" {
  /** A class name, or a map of transition type -> class name. */
  type ViewTransitionClass = string | Record<string, string>;

  interface ViewTransitionProps {
    children?: React.ReactNode;
    /** Applied when the element is added by this transition. */
    enter?: ViewTransitionClass;
    /** Applied when the element is removed by this transition. */
    exit?: ViewTransitionClass;
    /** Applied when a same-named element persists across the transition. */
    share?: ViewTransitionClass;
    /** Applied when the element updates in place. */
    update?: ViewTransitionClass;
    /** Fallback for any case above that isn't specified. "none" opts out. */
    default?: ViewTransitionClass;
    /** Shared identity, for morphing one element into another. */
    name?: string;
  }

  const ViewTransition: React.FC<ViewTransitionProps>;
}
