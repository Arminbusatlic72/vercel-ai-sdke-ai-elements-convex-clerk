export default function TrustIndicators() {
  return (
    <div className="mt-16 pt-8 border-t border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <div>
          <div className="text-2xl mb-2">🔄</div>
          <h4 className="font-medium text-gray-900">No hidden fees</h4>
          <p className="text-gray-600 text-sm">Transparent pricing</p>
        </div>
        <div>
          <div className="text-2xl mb-2">🛡️</div>
          <h4 className="font-medium text-gray-900">Cancel anytime</h4>
          <p className="text-gray-600 text-sm">
            Full control over your subscription
          </p>
        </div>
        <div>
          <div className="text-2xl mb-2">👨‍💻</div>
          <h4 className="font-medium text-gray-900">24/7 support</h4>
          <p className="text-gray-600 text-sm">Email & chat support</p>
        </div>
      </div>
    </div>
  );
}
