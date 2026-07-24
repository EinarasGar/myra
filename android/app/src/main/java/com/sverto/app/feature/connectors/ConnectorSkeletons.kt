package com.sverto.app.feature.connectors

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.dp
import com.sverto.app.core.ui.shimmerBrush

@Composable
fun ConnectorListSkeleton(modifier: Modifier = Modifier) {
    val brush = shimmerBrush()
    Column(modifier.fillMaxWidth()) {
        repeat(2) {
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier
                        .size(44.dp)
                        .background(brush, RoundedCornerShape(14.dp)),
                )
                Spacer(Modifier.width(16.dp))
                Column(Modifier.weight(1f)) {
                    Box(
                        Modifier
                            .fillMaxWidth(0.35f)
                            .height(16.dp)
                            .background(brush, RoundedCornerShape(4.dp)),
                    )
                    Spacer(Modifier.height(8.dp))
                    Box(
                        Modifier
                            .fillMaxWidth(0.65f)
                            .height(12.dp)
                            .background(brush, RoundedCornerShape(4.dp)),
                    )
                }
            }
        }
    }
}

@Composable
fun ConnectionCardSkeleton(modifier: Modifier = Modifier) {
    val brush = shimmerBrush()
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surfaceBright,
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Box(
                    Modifier
                        .fillMaxWidth(0.4f)
                        .height(16.dp)
                        .background(brush, RoundedCornerShape(4.dp)),
                )
                Spacer(Modifier.height(10.dp))
                Box(
                    Modifier
                        .fillMaxWidth(0.6f)
                        .height(12.dp)
                        .background(brush, RoundedCornerShape(4.dp)),
                )
            }
            Spacer(Modifier.width(16.dp))
            Box(
                Modifier
                    .width(72.dp)
                    .height(28.dp)
                    .background(brush, RoundedCornerShape(50)),
            )
        }
    }
}

@Composable
fun ConnectionDetailSkeleton(modifier: Modifier = Modifier) {
    val brush = shimmerBrush()
    Column(modifier.fillMaxWidth()) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surfaceBright,
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier
                        .size(48.dp)
                        .background(brush, RoundedCornerShape(16.dp)),
                )
                Spacer(Modifier.width(16.dp))
                Column(Modifier.weight(1f)) {
                    Box(
                        Modifier
                            .fillMaxWidth(0.4f)
                            .height(16.dp)
                            .background(brush, RoundedCornerShape(4.dp)),
                    )
                    Spacer(Modifier.height(8.dp))
                    Box(
                        Modifier
                            .fillMaxWidth(0.55f)
                            .height(12.dp)
                            .background(brush, RoundedCornerShape(4.dp)),
                    )
                }
                Spacer(Modifier.width(16.dp))
                Box(
                    Modifier
                        .width(72.dp)
                        .height(28.dp)
                        .background(brush, RoundedCornerShape(50)),
                )
            }
        }
        Spacer(Modifier.height(32.dp))
        Box(
            Modifier
                .width(160.dp)
                .height(18.dp)
                .background(brush, RoundedCornerShape(4.dp)),
        )
        Spacer(Modifier.height(12.dp))
        BindingRowsSkeleton(rows = 2, brush = brush)
    }
}

@Composable
fun BindingRowsSkeleton(
    modifier: Modifier = Modifier,
    rows: Int = 3,
    brush: Brush = shimmerBrush(),
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surfaceBright,
    ) {
        Column {
            repeat(rows) {
                Row(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Box(
                            Modifier
                                .fillMaxWidth(0.5f)
                                .height(16.dp)
                                .background(brush, RoundedCornerShape(4.dp)),
                        )
                        Spacer(Modifier.height(8.dp))
                        Box(
                            Modifier
                                .fillMaxWidth(0.35f)
                                .height(12.dp)
                                .background(brush, RoundedCornerShape(4.dp)),
                        )
                    }
                    Spacer(Modifier.width(16.dp))
                    Box(
                        Modifier
                            .width(64.dp)
                            .height(36.dp)
                            .background(brush, RoundedCornerShape(50)),
                    )
                }
            }
        }
    }
}
