// Author: bachvtuan@gmail.com
// Modified, Refactored By Aerocode.

if (!String.prototype.formatString) {
    /**
     * {0}-{1}-{2}... 형태의 문자열에 인자를 하나씩 삽입한다.
     *
     * @example)
     *      "{0}-{1}-{2}".formatString('a', 'b', 'c') => "a-b-c"
     */
    String.prototype.formatString = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != "undefined" ? args[number] : match;
        });
    };
}

function init_github_graph($) {
    $.fn.github_graph = function (options) {
        /**
         * 카운팅 결과 { [formatedDate :string] :number }
         */
        const countings = {};

        /**
         * 숫자가 10 이하라면 앞에 0을 붙인다.
         *
         * @param {number} number
         */
        function prettyNumber(number) {
            return number < 10
                ? "0" + number.toString()
                : (number = number.toString());
        }

        /**
         * 주어진 타임스탬프 배열에서 각 날짜를 카운팅하고,
         * 그 결과를 배열에 담아 반환한다.
         */
        function processListTimeStamp(formatedDateList) {
            for (const formatedDate of formatedDateList) {
                countings[formatedDate] = (countings[formatedDate] || 0) + 1;
            }
        }

        /**
         * 날짜에서 "yyyy-mm-dd" 형태로 포맷된 문자열을 얻는다.
         *
         * @param {Date} date 날짜 객체
         */
        function getFormatedDate(date) {
            const yyyy = date.getFullYear();
            const mm = prettyNumber(date.getMonth() + 1);
            const dd = prettyNumber(date.getDate());
            return "{0}-{1}-{2}".formatString(yyyy, mm, dd);
        }

        /**
         * 해당 날짜의 카운트를 가져온다.
         *
         * @param {string} formatedDate "yyyy-mm-dd" 형태로 포맷된 날짜 문자열
         */
        function getCount(formatedDate) {
            return countings[formatedDate] || 0;
        }

        /**
         * 어떤 카운트에 맞는 색상을 가져온다.
         */
        function getColor(count) {
            return settings.colors[Math.min(count, settings.colors.length - 1)];
        }

        function start() {
            processListTimeStamp(settings.data);
            var wrap_chart = _this;

            settings.colors_length = settings.colors.length;

            //
            // 윤년을 고려하여 시작점을 구한다.
            // 시작점은 반드시 자정을 가르켜야 하고,
            // 1년을 뺀 뒤에 52주 이내의 첫 번째 일요일이 나올때까지 하루씩 더한다.
            const now = new Date();
            const srtDate = new Date(now);
            srtDate.setHours(0, 0, 0, 0);
            srtDate.setMonth(srtDate.getMonth() - 12);
            while (true) {
                const msPer52Week = 31449600000;
                const interval = now - srtDate;
                const isIn52Weeks = interval <= msPer52Week;
                const isSunday = srtDate.getDay() === 0;
                if (isSunday && isIn52Weeks) break;
                srtDate.setDate(srtDate.getDate() + 1);
            }

            var loop_html = "";

            //One year has 52 weeks
            var step = 14;

            var month_position = [];
            var current_date = new Date();
            month_position.push({ month_index: srtDate.getMonth(), x: 0 });
            var using_month = srtDate.getMonth();
            for (var i = 0; i < 52; i++) {
                var g_x = i * step;
                var item_html =
                    '<g transform="translate(' + g_x.toString() + ',0)">';

                for (var j = 0; j < 7; j++) {
                    if (srtDate > current_date) {
                        //Break the loop
                        break;
                    }
                    var y = j * step;

                    var month_in_day = srtDate.getMonth();
                    var data_date = getFormatedDate(srtDate);
                    //Check first day in week
                    if (j == 0 && month_in_day != using_month) {
                        using_month = month_in_day;
                        month_position.push({
                            month_index: using_month,
                            x: g_x,
                        });
                    }
                    //move on to next day
                    srtDate.setDate(srtDate.getDate() + 1);
                    var count = getCount(data_date);
                    var color = getColor(count);

                    item_html += `<rect class="day" width="${12}" height="${12}" y="${y}" fill="${color}" data-count="${count}" data-date="${data_date}" /> `;
                }

                item_html += "</g>";

                loop_html += item_html;
            }

            //trick
            if (month_position[1].x - month_position[0].x < 40) {
                //Fix ugly graph by remove first item
                month_position.shift(0);
            }

            for (var i = 0; i < month_position.length; i++) {
                var item = month_position[i];
                var month_name = settings.month_names[item.month_index];
                loop_html +=
                    '<text x="' +
                    item.x +
                    '" y="-5" class="month">' +
                    month_name +
                    "</text>";
            }

            //Add Monday, Wenesday, Friday label
            loop_html +=
                '<text text-anchor="middle" class="wday" dx="-10" dy="24">{0}</text>'.formatString(
                    settings.h_days[0]
                ) +
                '<text text-anchor="middle" class="wday" dx="-10" dy="53">{0}</text>'.formatString(
                    settings.h_days[1]
                ) +
                '<text text-anchor="middle" class="wday" dx="-10" dy="80">{0}</text>'.formatString(
                    settings.h_days[2]
                );

            function numberWithCommas(x) {
                return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }

            //Fixed size for now with width= 721 and height = 110
            var wire_html = `
            <div id="contribution-graph">
                ${
                    settings.viewHeader
                        ? `
                            <div id="graph-header">
                                ${numberWithCommas(settings.data.length)} 
                                ${
                                    settings.data.length <= 1 ? "post" : "posts"
                                } in the last year
                            </div>
                          `
                        : `
                          `
                }
                
                <div id="graph-border">
                    <div id="graph-holder">
                        <svg width="755px" height="128px" class="js-calendar-graph-svg">
                            <g transform="translate(15, 25)">
                                ${loop_html}
                            </g>
                        </svg>
                    </div>
                    <div class="contrib-footer clearfix mt-1 mx-3 px-3 pb-1">
                        <div class="footer-how-count">
                            <a href="https://aerocode.net/353" target="_blank" class="">
                                Learn how we count contributions</a>.
                            </div>
                        <div class="contrib-legend text-gray" title="블로그에 작성한 게시글 개수를 의미합니다.">
                        Less
                        <ul class="legend">
                            <li style="background-color: #ebedf0"></li>
                            <li style="background-color: #c6e48b"></li>
                            <li style="background-color: #7bc96f"></li>
                            <li style="background-color: #239a3b"></li>
                            <li style="background-color: #196127"></li>
                        </ul>
                        More
                    </div>
                </div>
            </div id="contribution-graph">
            `;

            wrap_chart.html(wire_html);

            //Mare sure off previous event
            /*$(document).off('mouseenter', _this.find('rect'), mouseEnter );
          $(document).off('mouseleave', _this.find('rect'), mouseLeave );
          $(document).on('mouseenter', _this.find('rect'), mouseEnter );
          $(document).on('mouseleave', _this.find('rect'), mouseLeave );
*/
            _this.find("rect").on("mouseenter", mouseEnter);
            _this.find("rect").on("mouseleave", mouseLeave);
            appendTooltip();
        }

        var mouseLeave = function (evt) {
            $(".svg-tip").hide();
        };

        //handle event mouseenter when enter into rect element
        var mouseEnter = function (evt) {
            var target_offset = $(evt.target).offset();
            var count = $(evt.target).attr("data-count");
            var date = $(evt.target).attr("data-date");

            var count_text = count != 1 ? settings.texts[1] : settings.texts[0];
            var text = "{0} {1} on {2}".formatString(count, count_text, date);

            var svg_tip = $(".svg-tip").show();
            svg_tip.html(text);
            var svg_width = Math.round(svg_tip.width() / 2 + 5);
            var svg_height = svg_tip.height() * 2 + 10;

            svg_tip.css({ top: target_offset.top - svg_height - 5 });
            svg_tip.css({ left: target_offset.left - svg_width });
        };
        //Append tooltip to display when mouse enter the rect element
        //Default is display:none
        var appendTooltip = function () {
            if ($(".svg-tip").length == 0) {
                $("body").append(
                    '<div class="svg-tip svg-tip-one-line" style="display:none" ></div>'
                );
            }
        };

        var settings = $.extend(
            {
                //Default init settings.colors, user can override
                colors: ["#eeeeee", "#d6e685", "#8cc665", "#44a340", "#44a340"],

                //List of name months
                month_names: [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                ],
                h_days: ["M", "W", "F"],

                //Default is empty, it can be overrided
                data: [],
            },
            options
        );

        var _this = $(this);

        start();
    };
}
