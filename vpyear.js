// Year view for visual-planner: twelve month calendars in a grid,
// with event bars laid out like Google Calendar's month view.

angular.module("vpApp").directive("vpYear", function(vpGCal, $rootScope, $window) {

	var DAY = 86400000;
	function dnum(y, m, d) { return Math.round(Date.UTC(y, m, d) / DAY); }
	function dnumFromYmd(ymd) { return dnum(+ymd.substr(0, 4), +ymd.substr(5, 2) - 1, +ymd.substr(8, 2)); }
	function ymdFromDnum(n) { return new Date(n * DAY).toISOString().substr(0, 10); }
	function store(key, val) {
		try {
			if (val === undefined) return $window.localStorage.getItem(key);
			$window.localStorage.setItem(key, val);
		} catch (e) { return null; }
	}

	var template = `
<div id="vpyear" ng-class="{dark: vp.gridview.darkmode.checked}">
	<div class="yhead">
		<button class="ynav material-icons" title="Previous year" ng-click="vy.go(-1)">chevron_left</button>
		<div class="ytitle">{{vy.year}}</div>
		<button class="ynav material-icons" title="Next year" ng-click="vy.go(1)">chevron_right</button>
		<button class="ytoday" ng-click="vy.thisYear()" ng-hide="vy.year == vy.currentYear">This year</button>
		<div class="yspacer"></div>
		<span class="yloading" ng-show="vy.loading && !vy.error">Loading events</span>
		<span class="yerror" ng-show="vy.error">{{vy.error}}</span>
		<label class="ylanes">Events per day
			<select ng-model="vy.lanes" ng-change="vy.setLanes()" ng-options="n for n in [1,2,3,4,5,6]"></select>
		</label>
	</div>
	<div class="ymonths">
		<div class="ymonth" ng-repeat="m in vy.months" ng-class="{current: m.current}">
			<div class="ymonthname" ng-click="vy.openMonth(m)" title="Open in Google Calendar">{{m.name}}</div>
			<div class="ydow"><div ng-repeat="d in vy.dow track by $index">{{d}}</div></div>
			<div class="yweek" ng-repeat="w in m.weeks" ng-style="vy.weekStyle">
				<div class="ycell" ng-repeat="c in w.cells" ng-class="{out: !c.inMonth, weekend: c.weekend, today: c.today}" ng-style="{'grid-column': $index + 1}"></div>
				<div class="ynum" ng-repeat="c in w.cells" ng-if="c.inMonth" ng-style="{'grid-column': $index + 1}">
					<span ng-class="{today: c.today}" ng-click="vy.openDay(c)" title="Open day in Google Calendar">{{c.num}}</span>
				</div>
				<div class="ybar" ng-repeat="s in w.segs" ng-click="s.evt.edit()" title="{{s.evt.title}}"
					ng-class="{timed: s.dot, contl: s.contL, contr: s.contR}" ng-style="s.style">
					<span class="ydot" ng-if="s.dot" ng-style="{'background-color': s.evt.colour.background}"></span>{{s.evt.desc}}
				</div>
				<div class="ymore" ng-repeat="x in w.more" ng-style="{'grid-column': x.col}"
					ng-click="vy.openDay(x.cell)" title="Show all events on this day in Google Calendar">+{{x.n}}</div>
			</div>
		</div>
	</div>
</div>
<style>
#vpyear {
	--y-bg: #ffffff;
	--y-text: #3c4043;
	--y-muted: #70757a;
	--y-line: #dadce0;
	--y-weekend: #f6f7f8;
	--y-accent: #1a73e8;
	--y-bar: 1.15em;
	height: 100%;
	overflow: auto;
	box-sizing: border-box;
	padding: 0 1.25em 2em;
	background: var(--y-bg);
	color: var(--y-text);
	font-family: Arial, sans-serif;
}
#vpyear.dark {
	--y-bg: #202124;
	--y-text: #e8eaed;
	--y-muted: #9aa0a6;
	--y-line: #3c4043;
	--y-weekend: #26272a;
	--y-accent: #8ab4f8;
}
#vpyear .yhead {
	position: sticky;
	top: 0;
	z-index: 5;
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 0.5em;
	padding: 0.75em 0;
	background: var(--y-bg);
}
#vpyear .ytitle { font-size: 1.4em; min-width: 3em; text-align: center; }
#vpyear button {
	font-family: inherit;
	color: var(--y-text);
	background: transparent;
	border: 1px solid var(--y-line);
	border-radius: 4px;
	cursor: pointer;
}
#vpyear button.ynav { font-family: "Material Icons"; border: none; border-radius: 50%; font-size: 1.5em; padding: 0.1em; margin: 0; }
#vpyear button:hover { background: var(--y-weekend); }
#vpyear button:focus-visible, #vpyear select:focus-visible { outline: 2px solid var(--y-accent); outline-offset: 1px; }
#vpyear .ytoday { padding: 0.35em 0.8em; font-size: 0.85em; }
#vpyear .yspacer { flex: 1; }
#vpyear .yloading, #vpyear .ylanes { font-size: 0.8em; color: var(--y-muted); }
#vpyear .yerror { font-size: 0.8em; color: #d93025; }
#vpyear .ylanes select { margin-left: 0.4em; }
#vpyear .ymonths {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(17em, 1fr));
	gap: 1.5em 1.25em;
}
#vpyear .ymonthname {
	font-size: 1em;
	font-weight: bold;
	padding: 0 0 0.4em 0.2em;
	cursor: pointer;
}
#vpyear .ymonth.current .ymonthname { color: var(--y-accent); }
#vpyear .ydow {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	font-size: 0.65em;
	color: var(--y-muted);
	text-align: center;
	padding-bottom: 0.3em;
	border-bottom: 1px solid var(--y-line);
}
#vpyear .yweek {
	display: grid;
	grid-template-columns: repeat(7, minmax(0, 1fr));
	row-gap: 1px;
	font-size: 0.72em;
	border-bottom: 1px solid var(--y-line);
	padding-bottom: 2px;
}
#vpyear .ycell { grid-row: 1 / -1; z-index: 0; }
#vpyear .ycell.weekend { background: var(--y-weekend); }
#vpyear .ycell + .ycell { border-left: 1px solid var(--y-line); }
#vpyear .ycell.out { background: transparent; }
#vpyear .ynum {
	grid-row: 1;
	z-index: 1;
	text-align: center;
	padding: 2px 0 1px;
	color: var(--y-muted);
}
#vpyear .ynum span {
	display: inline-block;
	min-width: 1.6em;
	line-height: 1.6em;
	border-radius: 50%;
	cursor: pointer;
}
#vpyear .ynum span:hover { background: var(--y-line); }
#vpyear .ynum span.today { background: var(--y-accent); color: var(--y-bg); font-weight: bold; }
#vpyear .ybar {
	z-index: 2;
	height: var(--y-bar);
	line-height: var(--y-bar);
	margin: 0 2px;
	padding: 0 4px;
	border-radius: 3px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	cursor: pointer;
}
#vpyear .ybar.contl { margin-left: 0; border-top-left-radius: 0; border-bottom-left-radius: 0; }
#vpyear .ybar.contr { margin-right: 0; border-top-right-radius: 0; border-bottom-right-radius: 0; }
#vpyear .ybar.timed { background: transparent !important; color: var(--y-text) !important; padding-left: 1px; }
#vpyear .ydot {
	display: inline-block;
	width: 0.6em;
	height: 0.6em;
	border-radius: 50%;
	margin-right: 3px;
	vertical-align: 0.05em;
}
#vpyear .ybar:hover { filter: brightness(0.92); }
#vpyear.dark .ybar:not(.timed) { filter: brightness(0.85); }
#vpyear .ymore {
	grid-row: 1;
	justify-self: end;
	align-self: start;
	z-index: 3;
	font-size: 0.8em;
	font-weight: bold;
	padding: 1px 2px 0 0;
	color: var(--y-muted);
	cursor: pointer;
	white-space: nowrap;
}
#vpyear .ymore:hover { color: var(--y-text); }
@media (max-width: 600px) {
	#vpyear { padding: 0 0.75em 2em; }
	#vpyear .ymonths { grid-template-columns: 1fr; }
}
</style>`;

	return {
		restrict: "E",
		scope: true,
		template: template,
		controllerAs: "vy",
		controller: function($scope) {
			var vy = this;
			var cfg = $rootScope.vp.appdata;
			var cache = {};

			vy.currentYear = new Date().getFullYear();
			vy.year = vy.currentYear;
			vy.lanes = parseInt(store("vp-year-lanes")) || 3;
			vy.months = [];
			vy.loading = false;

			vy.setLanes = function() {
				store("vp-year-lanes", String(vy.lanes));
				render();
			};
			vy.go = function(step) { vy.year += step; load(false); };
			vy.thisYear = function() { vy.year = vy.currentYear; load(false); };
			vy.openMonth = function(m) { $window.open("https://www.google.com/calendar/r/month/" + vy.year + "/" + (m.index + 1) + "/1"); };
			vy.openDay = function(c) { $window.open("https://www.google.com/calendar/r/day/" + c.ymd.replace(/-/g, "/")); };

			function iso(y) { return new Date(y, 0, 1).toISOString(); }

			function load(force) {
				var y = vy.year;
				if (!force && cache[y]) { render(); return; }
				if (!$rootScope.vp.calendarlist || !$rootScope.vp.calendarlist.length) { render(); return; }

				vy.error = "";
				if (typeof vpGCal.fetchRange != "function") {
					vy.error = "Can't load events: the vplib.js on your site is an older version. Upload the latest vplib.js, then hard reload.";
					console.error("vpyear: vpGCal.fetchRange missing (old vplib.js)");
					render();
					return;
				}

				vy.loading = true;
				render();

				var done = false;
				var slow = setTimeout(function() {
					if (done || vy.year != y) return;
					$scope.$apply(function() { vy.error = "Events are taking unusually long to load. Check the browser console for errors."; });
				}, 20000);

				var request;
				try { request = vpGCal.fetchRange(iso(y), iso(y + 1)); }
				catch (e) { request = Promise.reject(e); }

				request.then(function(events) {
					done = true;
					clearTimeout(slow);
					cache[y] = events;
					console.log("vpyear: loaded " + events.length + " events for " + y);
					$scope.$apply(function() {
						if (vy.year == y) {
							vy.loading = false;
							vy.error = "";
							render();
						}
					});
				}, function(err) {
					done = true;
					clearTimeout(slow);
					console.error("vpyear:", err);
					$scope.$apply(function() {
						vy.loading = false;
						vy.error = "Couldn't load events: " + ((err && (err.message || (err.result && err.result.error && err.result.error.message))) || "unknown error") + ". Try the reload button.";
					});
				});
			}

			function render() {
				var y = vy.year;
				var fdw = parseInt(cfg.first_day_of_week) || 0;
				var weekends = String(cfg.weekends || "6,0").split(",").map(function(s) { return parseInt(s); });
				var letters = ["S", "M", "T", "W", "T", "F", "S"];
				var todayNum = dnum(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

				vy.dow = [];
				for (var i = 0; i < 7; i++) vy.dow.push(letters[(fdw + i) % 7]);
				vy.weekStyle = {"grid-template-rows": "auto repeat(" + vy.lanes + ", var(--y-bar))"};

				// normalise events to day numbers, skipping hidden calendars
				var evts = [];
				for (var e of (cache[y] || [])) {
					if (e.cal && e.cal.cls && e.cal.cls.checked) continue;
					var s = dnumFromYmd(e.start);
					evts.push({evt: e, s: s, e: s + Math.max(1, e.duration) - 1});
				}
				evts.sort(function(a, b) {
					return (a.s - b.s) || ((b.e - b.s) - (a.e - a.s)) || ((a.evt.timestamp || 0) - (b.evt.timestamp || 0)) || String(a.evt.desc).localeCompare(String(b.evt.desc));
				});

				var months = [];
				for (var m = 0; m < 12; m++) {
					var first = dnum(y, m, 1), last = dnum(y, m + 1, 1) - 1;
					var offset = (new Date(Date.UTC(y, m, 1)).getUTCDay() - fdw + 7) % 7;
					var month = {
						index: m,
						name: new Date(y, m, 1).toLocaleString(undefined, {month: "long"}),
						current: (y == new Date().getFullYear() && m == new Date().getMonth()),
						weeks: []
					};

					for (var w = first - offset; w <= last; w += 7) {
						var week = {cells: [], segs: [], more: []};
						for (var c = 0; c < 7; c++) {
							var n = w + c;
							var dow = (fdw + c) % 7;
							week.cells.push({
								num: n - first + 1,
								ymd: ymdFromDnum(n),
								inMonth: n >= first && n <= last,
								weekend: weekends.indexOf(dow) >= 0,
								today: n == todayNum
							});
						}

						var lo = Math.max(w, first), hi = Math.min(w + 6, last);
						var laneEnd = [];
						var hidden = [0, 0, 0, 0, 0, 0, 0];
						for (var ev of evts) {
							if (ev.s > hi || ev.e < lo) continue;
							var ss = Math.max(ev.s, lo), se = Math.min(ev.e, hi);
							var lane = 0;
							while (laneEnd[lane] !== undefined && laneEnd[lane] >= ss) lane++;
							laneEnd[lane] = se;

							if (lane >= vy.lanes) {
								for (var h = ss; h <= se; h++) hidden[h - w]++;
								continue;
							}

							var single = (ev.s == ev.e);
							var bg = ev.evt.colour && ev.evt.colour.background;
							var style = {"grid-column": (ss - w + 1) + " / span " + (se - ss + 1), "grid-row": lane + 2};
							if (!(single && ev.evt.timed)) {
								if (bg) style["background-color"] = bg;
								if (ev.evt.colour && ev.evt.colour.text) style["color"] = ev.evt.colour.text;
							}
							week.segs.push({
								evt: ev.evt,
								style: style,
								dot: single && ev.evt.timed,
								contL: ev.s < ss,
								contR: ev.e > se
							});
						}
						for (var k = 0; k < 7; k++)
							if (hidden[k]) week.more.push({col: k + 1, n: hidden[k], cell: week.cells[k]});

						month.weeks.push(week);
					}
					months.push(month);
				}
				vy.months = months;
			}

			$scope.$watch("vpapp.show.year", function(on) { if (on) load(false); });
			$scope.$watch("vp.calendarlist.length", function(n) { if (n && $scope.vpapp && $scope.vpapp.show.year) load(false); });
			$scope.$on("vpyear:reload", function() { cache = {}; load(true); });
		}
	};
});
