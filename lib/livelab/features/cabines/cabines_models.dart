// Cabines feature — domain models.
// Pure data classes — no Flutter imports — easy to map to Supabase rows or FastAPI JSON.

enum CabinStatus { live, busy, free, maint }

class CabinScheduleEntry {
  const CabinScheduleEntry({
    required this.time,
    required this.name,
    this.presenter,
    this.duration,
  });
  final String time;
  final String name;
  final String? presenter;
  final String? duration;
}

class CabinHistoryEntry {
  const CabinHistoryEntry({
    required this.time,
    required this.name,
    required this.gmv,
    required this.views,
  });
  final String time;
  final String name;
  final double gmv;
  final int views;
}

class Cabin {
  const Cabin({
    required this.id,
    required this.number,
    required this.status,
    this.liveAtualId,
    this.contratoId,
    this.clienteId,
    this.client,
    this.presenter,
    this.contract,
    this.startsIn,
    this.views = 0,
    this.gmv = 0,
    this.orders = 0,
    this.duration,
    this.maintenanceReason,
    this.maintenanceEta,
    this.agenda = const [],
    this.history = const [],
  });

  final String id;
  final int number;
  final CabinStatus status;
  final String? liveAtualId;
  final String? contratoId;
  final String? clienteId;
  final String? client;
  final String? presenter;
  final String? contract;
  final String? startsIn;
  final int views;
  final double gmv;
  final int orders;
  final String? duration;
  final String? maintenanceReason;
  final String? maintenanceEta;
  final List<CabinScheduleEntry> agenda;
  final List<CabinHistoryEntry> history;
}

class UpcomingScheduleEntry {
  const UpcomingScheduleEntry({
    required this.timeLabel,
    required this.title,
    required this.subtitle,
    this.now = false,
  });
  final String timeLabel;
  final String title;
  final String subtitle;
  final bool now;
}

class QueueEntry {
  const QueueEntry({
    required this.name,
    required this.contract,
    required this.location,
    required this.fee,
  });

  final String name;
  final String contract;
  final String location;
  final double fee;
}

class CabinFilters {
  const CabinFilters({this.search = '', this.status});
  final String search;
  final CabinStatus? status;

  CabinFilters copyWith({String? search, CabinStatus? status, bool clearStatus = false}) =>
      CabinFilters(
        search: search ?? this.search,
        status: clearStatus ? null : (status ?? this.status),
      );
}

extension CabinFiltering on List<Cabin> {
  List<Cabin> applyFilter(CabinFilters f) {
    return where((c) {
      if (f.status != null && c.status != f.status) return false;
      if (f.search.isNotEmpty) {
        final q = f.search.toLowerCase();
        return (c.client ?? '').toLowerCase().contains(q) ||
            (c.presenter ?? '').toLowerCase().contains(q) ||
            'cabine ${c.number}'.contains(q);
      }
      return true;
    }).toList();
  }
}
