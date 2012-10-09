$(document).ready(function () {
    setTimeout(setup, 500);
});

function setup() {
    var selectedYear = 2011;

    var stocksDataSource = new kendo.data.DataSource({
        transport: {
            read: {
                url: function() {
                    return "data/stock-data-" + selectedYear + ".json";
                },
                dataType: "json"
            }
        },

        group: {
            field: "symbol"
        },

        sort: {
            field: "date",
            dir: "asc"
        },

        schema: {
            model: {
                fields: {
                    date: {
                        type: "date"
                    }
                }
            }
        },

        change: function() {
            $("[name=chart-type][value=area]").prop("checked", true);

            var view = this.view(),
                index = $("#company-filtering-tabs").data("kendoTabStrip").select().index();

            // populate detailed stock prices
            populateStockPrices(view[index], index);
        }
    });

    var defaultSeriesColors = [ "#70b5dd", "#1083c7", "#1c638d" ];

    function populateStockPrices(data, companyIndex) {
        var container = $(".company-info"),
            yearlyStockValues = data.items,
            highest = yearlyStockValues[0].high,
            lowest = yearlyStockValues[0].low,
            volume = 0,
            metric = "",
            format = function(number) {
                return kendo.toString(number, "n");
            },
            sparklineOptions = function(field, color, data) {
                return {
                    dataSource: data || yearlyStockValues,
                    series: [{
                        field: field,
                        color: color
                    }],
                    seriesDefaults: {
                        type: "line",
                        markers: { visible: false },
                        line: { width: 2 }
                    },
                    axisDefaults: {
                        visible: false,
                        majorGridLines: { visible: false }
                    },
                    legend: { visible: false }
                };
            };

        $.each(yearlyStockValues, function() {
            highest = this.high > highest ? this.high : highest;
            lowest = this.low < lowest ? this.low : lowest;
            volume += this.volume;
        });

        if (volume > 999999999) {
            volume /= 1000000000;
            metric = "billions stocks";
        } else if (volume > 999999) {
            volume /= 1000000;
            metric = "millions stocks";
        }

        function yearlyRelativeValue(stockValues) {
            return stockValues[stockValues.length-1].close / stockValues[0].open * 100;
        }

        var relativeValues = $.map(yearlyStockValues, function(item, index) {
            var value = 100;

            if (index > 0) {
                value = item.close * 100 / yearlyStockValues[index - 1].open;
            }

            return { value: value };
        });

        var companyRelativeGain = $.map(stocksDataSource.view(), function(data, index) {
            return {
                value: yearlyRelativeValue(data.items) - 100
            };
        });

        container
            .find(".eoy-closing").text(format(yearlyStockValues[yearlyStockValues.length - 1].close)).end()
            .find(".highest").text(format(highest)).end()
            .find(".lowest").text(format(lowest)).end()
            .find(".lowest-sparkline").kendoChart(sparklineOptions("low", "#cd1533")).end()
            .find(".highest-sparkline").kendoChart(sparklineOptions("high", "#639514")).end()
            .find(".first dt .metric").eq(1).text(metric).end().end()
            .find(".volume").text(format(volume)).end()
            .find(".relative-value").text(format(yearlyRelativeValue(yearlyStockValues) - 100) + "%").end()
            .find(".relative-value-sparkline").kendoChart(sparklineOptions("value", "#4da3d5", relativeValues)).end()
            .find(".relative-value-pie").kendoChart({
                dataSource: companyRelativeGain,
                seriesDefaults: {
                    type: "pie",
                    overlay: {
                        gradient: "none"
                    }
                },
                seriesColors: defaultSeriesColors,
                series: [{
                    field: "value"
                }],
                legend: { visible: false }
            }).end()
            .find(".volume-chart").kendoChart({
                dataSource: yearlyStockValues,
                series: [{
                    field: "volume",
                    gap: 0.7
                }],
                seriesDefaults: {
                    type: "column",
                    color: "#1c638d",
                    border: {
                        width: 0
                    },
                    overlay: {
                        gradient: "none"
                    }
                },
                axisDefaults: {
                    majorGridLines: { visible: false },
                    majorTicks: { visible: false }
                },
                categoryAxis: {
                    field: "date",

                    labels: {
                        format: "MMM",
                        color: "#727f8e"
                    }
                },
                tooltip: {
                    visible: true
                },
                valueAxis: {
                    visible: false
                },
                legend: { visible: false }
            }).end();
    }

    $("#yearly-stock-prices").kendoChart({
        dataSource: stocksDataSource,

        autoBind: false,

        seriesDefaults: {
            type: "area",
            overlay: {
                gradient: "none"
            },
            markers: {
                visible: false
            },
            majorTickSize: 0,
            opacity: .8
        },

        series: [{
            field: "close"
        }],

        seriesColors: defaultSeriesColors,

        valueAxis: {
            line: {
                visible: false
            },

            labels: {
                format: "${0}",
                skip: 2,
                step: 2,
                color: "#727f8e"
            }
        },

        categoryAxis: {
            field: "date",

            labels: {
                format: "MMM",
                color: "#727f8e"
            },

            line: {
                visible: false
            },

            majorTicks: {
                visible: false
            },

            majorGridLines: {
                visible: false
            }
        },

        legend: {
            visible: false
        }
    });

    $("[name=chart-type]").on("click", function() {
        var chart = $("#yearly-stock-prices").data("kendoChart"),
            allSeries = chart.options.series,
            newSeriesType = $(this).val();

        chart.options.seriesDefaults.type = newSeriesType;

        for (var series in allSeries) {
            allSeries[series].type = newSeriesType;
            allSeries[series].opacity = newSeriesType == "area" ? .8 : 1;
        }

        chart.redraw();
    });

    var companyInfoTemplate = kendo.template($("#company-info-template").html());

    $(".company-info").each(function() {
        var panel = $(this);
        panel.html(companyInfoTemplate({ name: panel.attr("id") }));
    });

    $("#year-filtering-tabs").kendoTabStrip({
        dataSource: ["2007","2008","2009","2010","2011"],
        change: function(e) {
            selectedYear = this.value();

            $(".selected-year").text(selectedYear);

            stocksDataSource.read();
        }
    }).data("kendoTabStrip").select(4);

    $("#company-filtering-tabs").kendoTabStrip({
        dataSource: ["Google", "Apple", "Amazon"],
        change: function() {
            var company = this.value().toLowerCase(),
                index = this.select().index(),
                view = stocksDataSource.view();

            if (view.length) {
                $(".company-info").html(companyInfoTemplate({ name: company }));

                populateStockPrices(view[index], index);
            }
        }
    })
        .find(".k-item").each(function(index) {
            var color = defaultSeriesColors[index];

            $(this).css({
                color: color,
                borderColor: color
            });
        }).end()
        .data("kendoTabStrip").select(0);

}
