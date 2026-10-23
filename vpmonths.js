// 3-month view for visual-planner: three full-size month calendars side by side,
// scrolling horizontally, laid out like Google Calendar's month view but showing
// every event in full (all-day bars on top, then each day's timed events in time order).

angular.module("vpApp").directive("vpMonths", function(vpGCal, $rootScope, $window) {

	var DAY = 86400000;
	var MONTHS_SHOWN = 3;
	function dnum(y, m, d) { return Math.round(Date.UTC(y, m, d) / DAY); }
	function dnumFromYmd(ymd) { return dnum(+ymd.substr(0, 4), +ymd.substr(5, 2) - 1, +ymd.substr(8, 2)); }
	function ymdFromDnum(n) { return new Date(n * DAY).toISOString().substr(0, 10); }

	// Google-style times: "6pm", "6:30pm", or "18:30" in 24-hour mode
	function fmtTime(d, withSuffix) {
		var h = d.getHours(), m = d.getMinutes();
		var mm = m ? ":" + (m < 10 ? "0" : "") + m : "";
		if (typeof VpDateTime != "undefined" && VpDateTime.time24h)
			return h + ":" + (m < 10 ? "0" : "") + m;
		return ((h % 12) || 12) + mm + (withSuffix ? (h < 12 ? "am" : "pm") : "");
	}
	function fmtRange(a, b) {
		if (!a) return "";
		if (!b || b.getTime() == a.getTime()) return fmtTime(a, true);
		var sameHalf = (a.getHours() < 12) == (b.getHours() < 12);
		var is24 = typeof VpDateTime != "undefined" && VpDateTime.time24h;
		return fmtTime(a, is24 || !sameHalf) + " \u2013 " + fmtTime(b, true);
	}

	var template = `
<div id="vpmonths" ng-class="{dark: vp.gridview.darkmode.checked}">
	<div class="mhead">
		<button class="mnav material-icons" title="Previous month" ng-click="vm.go(-1)">chevron_left</button>
		<button class="mnav material-icons" title="Next month" ng-click="vm.go(1)">chevron_right</button>
		<div class="mtitle">{{vm.title}}</div>
		<button class="mtoday" ng-click="vm.today()" ng-hide="vm.isCurrent()">Today</button>
		<div class="mspacer"></div>
		<span class="mstatus" ng-show="vm.loading && !vm.error">Loading events</span>
		<span class="merror" ng-show="vm.error">{{vm.error}}</span>
	</div>
	<div class="mscroll">
		<div class="mpanel" ng-repeat="m in vm.months">
			<div class="mname" ng-class="{current: m.current}" ng-click="vm.openMonth(m)" title="Open in Google Calendar">{{m.name}}</div>
			<div class="mdow"><div ng-repeat="d in vm.dow track by $index">{{d}}</div></div>
			<div class="mweek" ng-repeat="w in m.weeks" ng-style="w.style">
				<div class="mcell" ng-repeat="c in w.cells" ng-class="{out: !c.inMonth, weekend: c.weekend}" ng-style="{'grid-column': $index + 1}"></div>
				<div class="mnum" ng-repeat="c in w.cells" ng-class="{out: !c.inMonth}" ng-style="{'grid-column': $index + 1}">
					<span ng-class="{today: c.today}" ng-click="vm.openDay(c)" title="Open day in Google Calendar">{{c.label}}</span>
				</div>
				<div class="mbar" ng-repeat="s in w.segs" ng-click="s.evt.edit()" title="{{s.evt.title}}"
					ng-class="{contl: s.contL, contr: s.contR}" ng-style="s.style"><span class="mtime" ng-if="s.time">{{s.time}}</span>{{s.evt.summary}}</div>
				<div class="mday" ng-repeat="c in w.cells" ng-class="{out: !c.inMonth}" ng-style="{'grid-column': $index + 1, 'grid-row': w.timedRow}">
					<div class="mitem" ng-repeat="t in c.timed" ng-click="t.evt.edit()" title="{{t.evt.title}}">
						<span class="mdot" ng-style="{'background-color': t.evt.colour.background || '#9aa0a6'}"></span>
						<div class="mtext"><div class="mtime">{{t.time}}</div><div class="mtitle2">{{t.evt.summary}}</div></div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
<style>
#vpmonths {
	--m-bg: #ffffff;
	--m-text: #3c4043;
	--m-muted: #70757a;
	--m-line: #dadce0;
	--m-weekend: #f8f9fa;
	--m-accent: #1a73e8;
	height: 100%;
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	background: var(--m-bg);
	color: var(--m-text);
	font-family: Arial, sans-serif;
}
#vpmonths.dark {
	--m-bg: #202124;
	--m-text: #e8eaed;
	--m-muted: #9aa0a6;
	--m-line: #3c4043;
	--m-weekend: #26272a;
	--m-accent: #8ab4f8;
}
#vpmonths .mhead {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.25em 0.5em;
	padding: 0.6em 1.25em;
	border-bottom: 1px solid var(--m-line);
}
#vpmonths .mtitle { font-size: 1.35em; margin: 0 0.4em; }
#vpmonths button {
	font-family: inherit;
	color: var(--m-text);
	background: transparent;
	border: 1px solid var(--m-line);
	border-radius: 4px;
	cursor: pointer;
}
#vpmonths button.mnav { font-family: "Material Icons"; border: none; border-radius: 50%; font-size: 1.5em; padding: 0.1em; margin: 0; }
#vpmonths button:hover { background: var(--m-weekend); }
#vpmonths button:focus-visible { outline: 2px solid var(--m-accent); outline-offset: 1px; }
#vpmonths .mtoday { padding: 0.35em 0.8em; font-size: 0.85em; }
#vpmonths .mspacer { flex: 1; }
#vpmonths .mstatus { font-size: 0.8em; color: var(--m-muted); }
#vpmonths .merror { font-size: 0.8em; color: #d93025; }
#vpmonths .mscroll {
	flex: 1;
	min-height: 0;
	display: flex;
	gap: 1.5em;
	overflow: auto;
	padding: 1em 1.25em 2em;
	scroll-snap-type: x proximity;
	scroll-padding: 0 1.25em;
}
#vpmonths .mpanel {
	flex: 0 0 clamp(34em, 46vw, 64em);
	scroll-snap-align: start;
	align-self: flex-start;
}
#vpmonths .mname {
	font-size: 1.15em;
	font-weight: bold;
	padding: 0 0 0.5em 0.15em;
	cursor: pointer;
}
#vpmonths .mname.current { color: var(--m-accent); }
#vpmonths .mdow {
	display: grid;
	grid-template-columns: repeat(7, minmax(0, 1fr));
	font-size: 0.7em;
	font-weight: bold;
	letter-spacing: 0.04em;
	color: var(--m-muted);
	text-align: center;
	border: 1px solid var(--m-line);
	border-bottom: none;
	padding: 0.4em 0;
}
#vpmonths .mweek {
	display: grid;
	grid-template-columns: repeat(7, minmax(0, 1fr));
	row-gap: 2px;
	min-height: 7.5em;
	font-size: 0.8em;
	border: 1px solid var(--m-line);
	border-bottom: none;
}
#vpmonths .mweek:last-child { border-bottom: 1px solid var(--m-line); }
#vpmonths .mcell { grid-row: 1 / -1; z-index: 0; }
#vpmonths .mcell + .mcell { border-left: 1px solid var(--m-line); }
#vpmonths .mcell.weekend { background: var(--m-weekend); }
#vpmonths .mnum {
	grid-row: 1;
	z-index: 1;
	text-align: center;
	padding: 4px 0 2px;
	font-size: 0.95em;
}
#vpmonths .mnum.out { color: var(--m-muted); }
#vpmonths .mnum span {
	display: inline-block;
	min-width: 1.8em;
	padding: 0 0.3em;
	line-height: 1.8em;
	border-radius: 0.9em;
	cursor: pointer;
	box-sizing: border-box;
}
#vpmonths .mnum span:hover { background: var(--m-line); }
#vpmonths .mnum span.today { background: var(--m-accent); color: var(--m-bg); font-weight: bold; }
#vpmonths .mbar {
	z-index: 2;
	margin: 0 3px;
	padding: 1px 5px;
	border-radius: 4px;
	line-height: 1.35;
	overflow: hidden;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	cursor: pointer;
	overflow-wrap: break-word;
}
#vpmonths .mbar.contl { margin-left: 0; border-top-left-radius: 0; border-bottom-left-radius: 0; }
#vpmonths .mbar.contr { margin-right: 0; border-top-right-radius: 0; border-bottom-right-radius: 0; }
#vpmonths .mbar:hover { filter: brightness(0.93); }
#vpmonths.dark .mbar { filter: brightness(0.85); }
#vpmonths .mday {
	z-index: 1;
	min-width: 0;
	padding: 0 3px 4px;
}
#vpmonths .mday.out { opacity: 0.55; }
#vpmonths .mitem {
	display: flex;
	align-items: baseline;
	gap: 4px;
	padding: 1px 2px;
	border-radius: 4px;
	line-height: 1.3;
	cursor: pointer;
}
#vpmonths .mitem:hover { background: var(--m-line); }
#vpmonths .mdot {
	flex: 0 0 auto;
	width: 0.6em;
	height: 0.6em;
	border-radius: 50%;
	transform: translateY(-0.05em);
}
#vpmonths .mtext { flex: 1; min-width: 0; overflow-wrap: break-word; }
#vpmonths .mtime { font-weight: bold; margin-right: 0.35em; white-space: nowrap; }
#vpmonths .mitem .mtime { font-weight: normal; color: var(--m-muted); font-size: 0.92em; white-space: normal; margin: 0; }
@media (max-width: 700px) {
	#vpmonths .mpanel { flex-basis: 92vw; }
	#vpmonths .mhead, #vpmonths .mscroll { padding-left: 0.75em; padding-right: 0.75em; }
}
</style>`;

	return {
		restrict: "E",
		scope: true,
		template: template,
		controllerAs: "vm",
		controller: function($scope, $element) {
			var vm = this;
			var cfg = $rootScope.vp.appdata;
			var cache = {};
			var now = new Date();

			vm.y = now.getFullYear();
			vm.m = now.getMonth();
			vm.months = [];
			vm.loading = false;

			vm.go = function(step) {
				var d = new Date(vm.y, vm.m + step, 1);
				vm.y = d.getFullYear();
				vm.m = d.getMonth();
				load(false);
			};
			vm.today = function() {
				vm.y = new Date().getFullYear();
				vm.m = new Date().getMonth();
				load(false);
			};
			vm.isCurrent = function() { return vm.y == new Date().getFullYear() && vm.m == new Date().getMonth(); };
			vm.openMonth = function(m) { $window.open("https://www.google.com/calendar/r/month/" + m.y + "/" + (m.m + 1) + "/1"); };
			vm.openDay = function(c) { $window.open("https://www.google.com/calendar/r/day/" + c.ymd.replace(/-/g, "/")); };

			function fdw() { return parseInt(cfg.first_day_of_week) || 0; }

			// first and last day numbers covered by the visible grids (including spill-over days)
			function span() {
				var y = vm.y, m = vm.m;
				var first = dnum(y, m, 1);
				var lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() - fdw() + 7) % 7;
				var lastMonthEnd = dnum(y, m + MONTHS_SHOWN, 1) - 1;
				var lastDow = new Date(lastMonthEnd * DAY).getUTCDay();
				var trail = (fdw() + 6 - lastDow + 7) % 7;
				return {lo: first - lead, hi: lastMonthEnd + trail};
			}

			function load(force) {
				var sp = span();
				var key = sp.lo + ":" + sp.hi;
				vm.error = "";
				if (!force && cache[key]) { render(); return; }
				if (!$rootScope.vp.calendarlist || !$rootScope.vp.calendarlist.length) { render(); return; }
				if (typeof vpGCal.fetchRange != "function") {
					vm.error = "Can't load events: the vplib.js on your site is an older version. Upload the latest vplib.js, then hard reload.";
					render();
					return;
				}

				vm.loading = true;
				render();

				var lo = new Date(sp.lo * DAY), hi = new Date((sp.hi + 1) * DAY);
				var isoLo = new Date(lo.getUTCFullYear(), lo.getUTCMonth(), lo.getUTCDate()).toISOString();
				var isoHi = new Date(hi.getUTCFullYear(), hi.getUTCMonth(), hi.getUTCDate()).toISOString();

				var request;
				try { request = vpGCal.fetchRange(isoLo, isoHi); }
				catch (e) { request = Promise.reject(e); }

				request.then(function(events) {
					cache[key] = events;
					$scope.$apply(function() {
						vm.loading = false;
						if (key == span().lo + ":" + span().hi) render();
					});
				}, function(err) {
					console.error("vpmonths:", err);
					$scope.$apply(function() {
						vm.loading = false;
						vm.error = "Couldn't load events: " + ((err && (err.message || (err.result && err.result.error && err.result.error.message))) || "unknown error") + ". Try the reload button.";
					});
				});
			}

			function render() {
				var sp = span();
				var events = cache[sp.lo + ":" + sp.hi] || [];
				var weekdays = String(cfg.weekends || "6,0").split(",").map(function(s) { return parseInt(s); });
				var names = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
				var t = new Date();
				var todayNum = dnum(t.getFullYear(), t.getMonth(), t.getDate());

				vm.dow = [];
				for (var i = 0; i < 7; i++) vm.dow.push(names[(fdw() + i) % 7]);

				// split events: bars (all-day or multi-day) vs. single-day timed items
				var bars = [], timed = [];
				for (var e of events) {
					if (e.cal && e.cal.cls && e.cal.cls.checked) continue;
					var s = dnumFromYmd(e.start);
					var rec = {evt: e, s: s, e: s + Math.max(1, e.duration) - 1};
					if (e.timed && rec.s == rec.e) timed.push(rec); else bars.push(rec);
				}
				bars.sort(function(a, b) {
					return (a.s - b.s) || ((b.e - b.s) - (a.e - a.s)) || ((a.evt.timestamp || 0) - (b.evt.timestamp || 0)) || a.evt.summary.localeCompare(b.evt.summary);
				});
				timed.sort(function(a, b) { return (a.evt.timestamp - b.evt.timestamp) || a.evt.summary.localeCompare(b.evt.summary); });

				var months = [];
				for (var k = 0; k < MONTHS_SHOWN; k++) {
					var md = new Date(vm.y, vm.m + k, 1);
					var y = md.getFullYear(), m = md.getMonth();
					var first = dnum(y, m, 1), last = dnum(y, m + 1, 1) - 1;
					var lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() - fdw() + 7) % 7;
					var month = {
						y: y, m: m,
						name: md.toLocaleString(undefined, {month: "long", year: "numeric"}),
						current: (y == t.getFullYear() && m == t.getMonth()),
						weeks: []
					};

					for (var w = first - lead; w <= last; w += 7) {
						var week = {cells: [], segs: []};
						for (var c = 0; c < 7; c++) {
							var n = w + c;
							var dt = new Date(n * DAY);
							var dom = dt.getUTCDate();
							week.cells.push({
								label: (dom == 1) ? dt.toLocaleString(undefined, {month: "short", day: "numeric", timeZone: "UTC"}) : dom,
								ymd: ymdFromDnum(n),
								inMonth: n >= first && n <= last,
								weekend: weekdays.indexOf(dt.getUTCDay()) >= 0,
								today: n == todayNum,
								timed: []
							});
						}

						// bars, stacked into lanes
						var laneEnd = [];
						for (var b of bars) {
							if (b.s > w + 6 || b.e < w) continue;
							var ss = Math.max(b.s, w), se = Math.min(b.e, w + 6);
							var lane = 0;
							while (laneEnd[lane] !== undefined && laneEnd[lane] >= ss) lane++;
							laneEnd[lane] = se;
							var style = {"grid-column": (ss - w + 1) + " / span " + (se - ss + 1), "grid-row": lane + 2};
							var bg = b.evt.colour && b.evt.colour.background;
							style["background-color"] = bg || "#9aa0a6";
							if (b.evt.colour && b.evt.colour.text) style["color"] = b.evt.colour.text;
							week.segs.push({
								evt: b.evt,
								style: style,
								time: (b.evt.timed && b.s == ss) ? fmtTime(b.evt.startDate, true) : "",
								contL: b.s < ss,
								contR: b.e > se
							});
						}

						// timed single-day events, listed in time order under each day
						for (var tr of timed) {
							if (tr.s < w || tr.s > w + 6) continue;
							week.cells[tr.s - w].timed.push({evt: tr.evt, time: fmtRange(tr.evt.startDate, tr.evt.endDate)});
						}

						week.timedRow = laneEnd.length + 2;
						week.style = {"grid-template-rows": "auto" + (laneEnd.length ? " repeat(" + laneEnd.length + ", auto)" : "") + " 1fr"};
						month.weeks.push(week);
					}
					months.push(month);
				}
				vm.months = months;

				var a = new Date(vm.y, vm.m, 1), z = new Date(vm.y, vm.m + MONTHS_SHOWN - 1, 1);
				vm.title = (a.getFullYear() == z.getFullYear())
					? a.toLocaleString(undefined, {month: "long"}) + " \u2013 " + z.toLocaleString(undefined, {month: "long", year: "numeric"})
					: a.toLocaleString(undefined, {month: "long", year: "numeric"}) + " \u2013 " + z.toLocaleString(undefined, {month: "long", year: "numeric"});
			}

			$scope.$watch("vpapp.show.months", function(on) { if (on) load(false); });
			$scope.$watch("vp.calendarlist.length", function(n) { if (n && $scope.vpapp && $scope.vpapp.show.months) load(false); });
			$scope.$on("vpyear:reload", function() { cache = {}; if ($scope.vpapp && $scope.vpapp.show.months) load(true); });
		}
	};
});
