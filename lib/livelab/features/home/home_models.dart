// Home feature — domain models.

import 'package:flutter/material.dart';

class HomeKpi {
  const HomeKpi({
    required this.label,
    required this.value,
    required this.delta,
    required this.deltaPositive,
    this.spark = const [],
    this.icon,
    this.footnote,
    this.primaryIcon = false,
  });
  final String label;
  final String value;
  final String delta;
  final bool deltaPositive;
  final List<double> spark;
  final IconData? icon;
  final String? footnote;
  final bool primaryIcon;
}

class LiveNow {
  const LiveNow({
    required this.cabin,
    required this.client,
    required this.presenter,
    required this.viewers,
    required this.gmv,
    required this.duration,
  });
  final int cabin;
  final String client;
  final String presenter;
  final int viewers;
  final double gmv;
  final String duration;
}

enum UpcomingStatus { now, warming, scheduled }

class UpcomingLive {
  const UpcomingLive({
    required this.time,
    required this.client,
    required this.cabin,
    required this.presenter,
    this.duration,
    this.status = UpcomingStatus.scheduled,
    this.viewers,
  });
  final String time;
  final String client;
  final int cabin;
  final String presenter;
  final String? duration;
  final UpcomingStatus status;
  final int? viewers;
}

class RankingEntry {
  const RankingEntry({required this.position, required this.name, required this.lives, required this.orders, required this.gmv});
  final int position;
  final String name;
  final int lives;
  final int orders;
  final double gmv;
}

class HomeAlert {
  const HomeAlert({
    required this.title,
    required this.subtitle,
    required this.severity,
    this.count,
  });
  final String title;
  final String subtitle;
  final HomeAlertSeverity severity;
  final int? count;
}

enum HomeAlertSeverity { info, warning, danger, success }

class CtaItem {
  const CtaItem({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.count,
    this.primary = false,
    this.onTap,
  });
  final IconData icon;
  final String title;
  final String subtitle;
  final int? count;
  final bool primary;
  final VoidCallback? onTap;
}

class HeroSummary {
  const HeroSummary({
    required this.liveCount,
    required this.totalCabins,
    required this.gmvMes,
    required this.gmvDelta,
    this.gmvDeltaPositive = true,
    this.gmvSpark = const [],
    this.nextLiveTime,
    this.nextLiveCabin,
    this.nextLiveClient,
    this.nextLiveStartsIn,
    this.viewersNow = 0,
    this.salesNow = 0,
    this.peakOfDay = false,
  });
  final int liveCount;
  final int totalCabins;
  final String gmvMes;
  final String gmvDelta;
  final bool gmvDeltaPositive;
  final List<double> gmvSpark;
  final String? nextLiveTime;
  final String? nextLiveCabin;
  final String? nextLiveClient;
  final String? nextLiveStartsIn;
  final int viewersNow;
  final double salesNow;
  final bool peakOfDay;
}

class HomeData {
  const HomeData({
    required this.hero,
    required this.ctas,
    required this.kpis,
    required this.alerts,
    required this.upcoming,
    required this.ranking,
    this.lives = const [],
  });
  final HeroSummary hero;
  final List<CtaItem> ctas;
  final List<HomeKpi> kpis;
  final List<HomeAlert> alerts;
  final List<UpcomingLive> upcoming;
  final List<RankingEntry> ranking;
  final List<LiveNow> lives;
}
