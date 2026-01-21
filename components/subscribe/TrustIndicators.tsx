// export default function TrustIndicators() {
//   return (
//     <div className="mt-16 pt-8 border-t border-gray-200">
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
//         <div>
//           <div className="text-2xl mb-2">🔄</div>
//           <h4 className="font-medium text-gray-900">No hidden fees</h4>
//           <p className="text-gray-600 text-sm">Transparent pricing</p>
//         </div>
//         <div>
//           <div className="text-2xl mb-2">🛡️</div>
//           <h4 className="font-medium text-gray-900">Cancel anytime</h4>
//           <p className="text-gray-600 text-sm">
//             Full control over your subscription
//           </p>
//         </div>
//         <div>
//           <div className="text-2xl mb-2">👨‍💻</div>
//           <h4 className="font-medium text-gray-900">24/7 support</h4>
//           <p className="text-gray-600 text-sm">Email & chat support</p>
//         </div>
//       </div>
//     </div>
//   );
// }

// components/subscribe/TrustIndicators.tsx
export default function TrustIndicators() {
  return (
    <div className="mt-12 pt-8 border-t border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">
            Secure & Encrypted
          </h3>
          <p className="text-gray-600 text-sm">
            Bank-level security with 256-bit SSL encryption
          </p>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Instant Access</h3>
          <p className="text-gray-600 text-sm">
            Get immediate access to all features after payment
          </p>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Cancel Anytime</h3>
          <p className="text-gray-600 text-sm">
            No long-term contracts. Cancel your plan anytime
          </p>
        </div>
      </div>
    </div>
  );
}
