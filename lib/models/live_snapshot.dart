// lib/models/live_snapshot.dart

class LiveSnapshot {
  final int viewerCount;
  final int totalViewers;
  final int totalOrders;
  final double gmv;
  final int likesCount;
  final int commentsCount;
  final int sharesCount;
  final int giftsDiamonds;

  const LiveSnapshot({
    required this.viewerCount,
    required this.totalViewers,
    required this.totalOrders,
    required this.gmv,
    required this.likesCount,
    required this.commentsCount,
    required this.sharesCount,
    required this.giftsDiamonds,
  });

  factory LiveSnapshot.fromJson(Map<String, dynamic> json) {
    return LiveSnapshot(
      viewerCount:    (json['viewer_count']    as num? ?? 0).toInt(),
      totalViewers:   (json['total_viewers']   as num? ?? 0).toInt(),
      totalOrders:    (json['total_orders']    as num? ?? 0).toInt(),
      gmv:            (json['gmv']             as num? ?? 0).toDouble(),
      likesCount:     (json['likes_count']     as num? ?? 0).toInt(),
      commentsCount:  (json['comments_count']  as num? ?? 0).toInt(),
      sharesCount:    (json['shares_count']    as num? ?? 0).toInt(),
      giftsDiamonds:  (json['gifts_diamonds']  as num? ?? 0).toInt(),
    );
  }
}
