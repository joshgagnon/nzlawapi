<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">


	<xsl:template match="*">
		<div>
			<xsl:attribute name="class">
				<xsl:value-of select ="name(.)"/>
			</xsl:attribute>
			<xsl:apply-templates />
		</div>
	</xsl:template>

	<xsl:template match="paragraph/label|text|footnote">
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

</xsl:stylesheet>