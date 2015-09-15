<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">


	<xsl:template match="*">
		<div>
			<xsl:attribute name="class">
				<xsl:value-of select ="name(.)"/>
			</xsl:attribute>
			<xsl:apply-templates />
		</div>
	</xsl:template>

	<xsl:template match="label|text|footnote">
		<span>
			<xsl:attribute name="class">
				<xsl:value-of select ="name(.)"/>
			</xsl:attribute>
			<xsl:apply-templates />
		</span>
	</xsl:template>

	<xsl:template match="emphasis">
		<emphasis>
			<xsl:apply-templates />
		</emphasis>
	</xsl:template>

	<xsl:template match="strong">
		<strong>
			<xsl:apply-templates />
		</strong>
	</xsl:template>

	<xsl:template match="footnote">
		<sup>
			<xsl:apply-templates />
		</sup>
	</xsl:template>



	<xsl:template match="title">
		<h4>
			<xsl:apply-templates />
		</h4>
	</xsl:template>

	<xsl:template match="subtitle">
		<h5>
			<xsl:apply-templates />
		</h5>
	</xsl:template>

	<xsl:template match="parties">
		<table class="parties">
			<tbody>
				<xsl:apply-templates />
			</tbody>
		</table>
	</xsl:template>

	<xsl:template match="court-file">
			<tr><td>&#160;</td><td>&#160;</td><td class="court-file"><xsl:value-of select="." /></td></tr>
	</xsl:template>

	<xsl:template match="neutral-citation">
		<table><tr><td>&#160;</td><td>&#160;</td><td class="neutral-citation"><xsl:value-of select="." /></td></tr></table>
	</xsl:template>

	<xsl:template match="defendants|plantiffs|thirdparties">
		<xsl:apply-templates />
	</xsl:template>

	<xsl:template match="matters">
		<xsl:apply-templates />
	</xsl:template>


	<xsl:template match="matters/court-file">
			<table><tr><td>&#160;</td><td>&#160;</td><td class="court-file"><xsl:value-of select="." /></td></tr></table>
	</xsl:template>

	<xsl:template match="matter">
		<table class="matter">
			<tbody>
				<tr class="table-gap-after">
					<td><xsl:value-of select="qualifier" /></td>
					<td><xsl:value-of select="value" /></td>
					<td>&#160;</td>
				</tr>
			</tbody>
		</table>
	</xsl:template>

	<xsl:template match="matter-join">
		<table class="matter">
			<tbody>
				<tr class="table-gap-after">
					<td><xsl:value-of select="." /></td>
					<td>&#160;</td>
					<td>&#160;</td>
				</tr>
			</tbody>
		</table>
	</xsl:template>


	<xsl:template match="defendant|plantiff|thirdparty">
		<xsl:apply-templates select="court-file"/>
		<xsl:if test="name(.)='defendant' and @versus = 'true'">
			<tr class="center table-gap-after"><td colspan="3">v</td></tr>
		</xsl:if>
		<xsl:choose>
		<xsl:when test="@versus = 'true'">
			<tr class="center table-gap-after">
				<td colspan="3"><xsl:value-of select="value" /></td>
			</tr>
		</xsl:when>
		<xsl:otherwise>
			<tr>
				<td><xsl:value-of select="qualifier" /></td>
				<td><xsl:value-of select="value" /></td>
				<td>&#160;</td>
			</tr>

			<xsl:if test="descriptor">
				<tr class="table-gap-after">
					<td>&#160;</td>
					<td><xsl:value-of select="descriptor" /></td>
					<td>&#160;</td>
				</tr>
			</xsl:if>
		</xsl:otherwise>
	</xsl:choose>
	</xsl:template>



	<xsl:template match="hearing[position() > 1]|counsel[position() > 1]|bench[position() > 1]|plea[position() > 1]|judgment[position() > 1]|solicitor[position() > 1]">
	</xsl:template>

	<xsl:template match="hearing[position() = 1]">
		<table class="hearing"><tbody>
			<tr><td>Hearing:</td><td><xsl:value-of select="."/></td></tr>
			<xsl:for-each select="following-sibling::hearing">
				<tr><td></td><td><xsl:value-of select="."/></td></tr>
			</xsl:for-each>
		</tbody></table>
	</xsl:template>

	<xsl:template match="counsel[position() = 1]">
		<table class="counsel"><tbody>
			<tr><td>Counsel:</td><td><xsl:value-of select="."/></td></tr>
			<xsl:for-each select="following-sibling::counsel">
				<tr><td></td><td><xsl:value-of select="."/></td></tr>
			</xsl:for-each>
		</tbody></table>
	</xsl:template>

	<xsl:template match="bench[position() = 1]">
		<table class="bench"><tbody>
			<tr><td>Bench:</td><td><xsl:value-of select="."/></td></tr>
			<xsl:for-each select="following-sibling::bench">
				<tr><td></td><td><xsl:value-of select="."/></td></tr>
			</xsl:for-each>
		</tbody></table>
	</xsl:template>

	<xsl:template match="plea[position() = 1]">
		<table class="plea"><tbody>
			<tr><td>Plea:</td><td><xsl:value-of select="."/></td></tr>
			<xsl:for-each select="following-sibling::plea">
				<tr><td></td><td><xsl:value-of select="."/></td></tr>
			</xsl:for-each>
		</tbody></table>
	</xsl:template>

	<xsl:template match="judgment[position() = 1]">
		<table class="judgment"><tbody>
			<tr><td>Judgment:</td><td><xsl:value-of select="."/></td></tr>
			<xsl:for-each select="following-sibling::judgment">
				<tr><td></td><td><xsl:value-of select="."/></td></tr>
			</xsl:for-each>
		</tbody></table>
	</xsl:template>

	<xsl:template match="solicitor[position() = 1]">
		<table class="solicitor"><tbody>
			<tr><td>Solicitor:</td><td><xsl:value-of select="."/></td></tr>
			<xsl:for-each select="following-sibling::solicitor">
				<tr><td></td><td><xsl:value-of select="."/></td></tr>
			</xsl:for-each>
		</tbody></table>
	</xsl:template>

	<xsl:template match="waistband">
		<div class="waistband">
			<xsl:apply-templates />
			<xsl:if test="text|list">
				<hr/>
			</xsl:if>
		</div>
	</xsl:template>

	<xsl:template match="waistband/title[position() = 1]">
		<hr/>
			<h4>
				<xsl:apply-templates />
			</h4>
		<xsl:for-each select="following-sibling::title">
			<h4>
				<xsl:apply-templates />
			</h4>
		</xsl:for-each>
		<hr/>
	</xsl:template>

	<xsl:template match="waistband/title[position() > 1]">
	</xsl:template>

	<xsl:template match="signature-line">
		<hr class="signature-line"/>
	</xsl:template>


	<xsl:template match="list">
		<ol>
			<xsl:apply-templates />
		</ol>
	</xsl:template>

	<xsl:template match="list/entry">
		<li>
			<xsl:if test="not(label)">
				<span class="label no-bracket">•</span>
			</xsl:if>
			<xsl:apply-templates />
		</li>
	</xsl:template>


	<xsl:template match="footnote-text/key">
		<sup>
			<xsl:apply-templates />
		</sup>
	</xsl:template>

	<xsl:template match="contents/table">
		<h4>Contents</h4>
		<table>
			<xsl:apply-templates />
		</table>
	</xsl:template>


	<xsl:template match="table/row">
		<tr>
			<xsl:if test="@minor='true'">
				<xsl:attribute name="class">minor</xsl:attribute>
			</xsl:if>
			<xsl:apply-templates />
		</tr>
	</xsl:template>

	<xsl:template match="table/row/entry">
		<td>
			<xsl:apply-templates />
		</td>
	</xsl:template>

	<xsl:template match="image">
		<div class="image">
			<img>
		        <xsl:copy-of select="@*"/>
			</img>
		</div>
	</xsl:template>


</xsl:stylesheet>