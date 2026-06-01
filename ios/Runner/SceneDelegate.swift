import Flutter
import UIKit

class SceneDelegate: FlutterSceneDelegate {
  private let privacyShieldTag = 991337

  override func sceneWillResignActive(_ scene: UIScene) {
    super.sceneWillResignActive(scene)
    showPrivacyShield()
  }

  override func sceneDidEnterBackground(_ scene: UIScene) {
    super.sceneDidEnterBackground(scene)
    showPrivacyShield()
  }

  override func sceneWillEnterForeground(_ scene: UIScene) {
    super.sceneWillEnterForeground(scene)
    hidePrivacyShield()
  }

  override func sceneDidBecomeActive(_ scene: UIScene) {
    super.sceneDidBecomeActive(scene)
    hidePrivacyShield()
  }

  private func showPrivacyShield() {
    guard let window, window.viewWithTag(privacyShieldTag) == nil else {
      return
    }

    let blurView = UIVisualEffectView(effect: UIBlurEffect(style: .systemChromeMaterial))
    blurView.tag = privacyShieldTag
    blurView.frame = window.bounds
    blurView.autoresizingMask = [.flexibleWidth, .flexibleHeight]

    let titleLabel = UILabel()
    titleLabel.translatesAutoresizingMaskIntoConstraints = false
    titleLabel.text = "Liveshop"
    titleLabel.textColor = .label
    titleLabel.font = UIFont.systemFont(ofSize: 24, weight: .semibold)

    blurView.contentView.addSubview(titleLabel)
    NSLayoutConstraint.activate([
      titleLabel.centerXAnchor.constraint(equalTo: blurView.contentView.centerXAnchor),
      titleLabel.centerYAnchor.constraint(equalTo: blurView.contentView.centerYAnchor),
    ])

    window.addSubview(blurView)
  }

  private func hidePrivacyShield() {
    window?.viewWithTag(privacyShieldTag)?.removeFromSuperview()
  }

}
