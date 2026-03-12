// centered modal dialog — pops up in the middle of the screen with a subtle scale-in animation
// use this anywhere you need a form popup without navigating away

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const BottomSheet = ({ isOpen, onClose, title, children }: BottomSheetProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* dim the background, tap it to close */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* centered modal panel, scales in from slightly smaller */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="w-full max-w-[420px] bg-card border border-border rounded-2xl shadow-xl pointer-events-auto"
                        >
                            <div className="px-5 py-5">
                                {/* header row with title and close button */}
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-base font-semibold text-foreground">{title}</h2>
                                    <button
                                        onClick={onClose}
                                        className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center tap-highlight-none"
                                    >
                                        <X size={14} className="text-muted-foreground" />
                                    </button>
                                </div>

                                {children}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default BottomSheet;
