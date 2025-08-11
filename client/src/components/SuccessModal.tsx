import React from "react";
import { Button } from "@/components/landingPage/ui/button";

interface SuccessModalProps {
  setShowSuccessModal: (show: boolean) => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ setShowSuccessModal }) => {
  return (
    <>
      <div
        id="popup-modal"
        className="overflow-y-auto overflow-x-hidden fixed z-50 justify-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full"
      >
        <div className="justify-self-center relative p-4 w-full max-w-md max-h-full">
          <div className="relative bg-black rounded-lg shadow-sm">
            <button
              onClick={() => {
                setShowSuccessModal(false);
              }}
              type="button"
              className="absolute top-3 end-2.5 text-gray-400 bg-transparent hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
              data-modal-hide="popup-modal"
            >
              <svg
                className="w-3 h-3"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 14"
              >
                <path
                  stroke="#6366f1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
              <span className="sr-only">Close modal</span>
            </button>
            <div className="p-4 md:p-5 text-center">
              <svg
                className="mx-auto mb-4 text-white w-12 h-12"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 20"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 11V6m0 8h.01M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300 text-xl sm:text-xl md:text-xl text-center">
                Thank you for your request. We will contact you shortly.
              </h3>
              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                }}
                data-modal-hide="popup-modal"
                type="button"
                className="mt-8 w-1/2 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 hover:opacity-90 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 text-lg font-orbitron border-0 cursor-pointer"
              >
                CLOSE
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SuccessModal;
